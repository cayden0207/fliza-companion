import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const elizaUrl = process.env.ELIZA_URL || 'http://localhost:3002';

const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory session cache (for production, use Redis or DB)
const sessionCache: Map<string, { sessionId: string; expiresAt: Date }> = new Map();

// Get or create ElizaOS session for a user
async function getOrCreateSession(userId: string, agentId: string): Promise<string | null> {
    // Check cache first
    const cached = sessionCache.get(userId);
    if (cached && new Date() < cached.expiresAt) {
        return cached.sessionId;
    }

    // Create new session
    try {
        const res = await fetch(`${elizaUrl}/api/messaging/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId, userId }),
        });

        if (!res.ok) {
            console.error('Session creation failed:', await res.text());
            return null;
        }

        const data = await res.json();
        const expiresAt = new Date(data.expiresAt);

        // Cache the session (with 5 min buffer before expiry)
        sessionCache.set(userId, {
            sessionId: data.sessionId,
            expiresAt: new Date(expiresAt.getTime() - 5 * 60 * 1000)
        });

        console.log('Created new ElizaOS session:', data.sessionId);
        return data.sessionId;
    } catch (e) {
        console.error('Session creation error:', e);
        return null;
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { message, userId } = body;

        if (!message || !userId) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Get agent ID
        const agentId = process.env.ELIZA_AGENT_ID || '16f68732-3783-05ea-b38a-ad1e1c7ea90c';

        // Get or create session
        const sessionId = await getOrCreateSession(userId, agentId);
        if (!sessionId) {
            return NextResponse.json({ error: 'Failed to create ElizaOS session' }, { status: 500 });
        }

        // Send message via Sessions API
        const elizaRes = await fetch(`${elizaUrl}/api/messaging/sessions/${sessionId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: message,
                mode: 'sync'
            }),
        });

        if (!elizaRes.ok) {
            const errText = await elizaRes.text();
            console.error('Eliza Message Error:', elizaRes.status, errText);

            // If session expired, clear cache and retry
            if (elizaRes.status === 404 || errText.includes('session')) {
                sessionCache.delete(userId);
            }

            return NextResponse.json({ error: `Eliza failed: ${elizaRes.status}`, details: errText.slice(0, 200) }, { status: 500 });
        }

        const elizaData = await elizaRes.json();

        // Extract response text
        const responseText = elizaData.agentResponse?.text;
        if (responseText) {
            // Save AI response to Supabase
            const { error } = await supabase.from('messages').insert({
                user_id: userId,
                role: 'assistant',
                content: responseText,
                metadata: {
                    thought: elizaData.agentResponse?.thought,
                    actions: elizaData.agentResponse?.actions,
                    sessionId: sessionId
                }
            });

            if (error) {
                console.error('Supabase Write Error:', error);
            }
        }

        return NextResponse.json({
            success: true,
            response: responseText,
            sessionId
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

