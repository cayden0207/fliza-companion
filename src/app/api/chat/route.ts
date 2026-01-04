import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const elizaUrl = process.env.ELIZA_URL || 'https://fliza-agent-production.up.railway.app';

const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory session cache (for production, use Redis or DB)
const sessionCache: Map<string, { sessionId: string; expiresAt: Date }> = new Map();

// Design intent detection keywords
const DESIGN_KEYWORDS = ['design', 'create', 'generate', 'make', 'draw', 'artwork', 'poster', 'image', 'picture', 'sketch'];
const CONTEXT_KEYWORDS = ['this', 'see', 'camera', 'looking', 'photo', 'here', 'showing'];

function detectDesignIntent(message: string): { isDesignRequest: boolean; prompt: string } {
    const lower = message.toLowerCase();
    const hasDesignKeyword = DESIGN_KEYWORDS.some(kw => lower.includes(kw));
    const hasContextKeyword = CONTEXT_KEYWORDS.some(kw => lower.includes(kw));

    if (hasDesignKeyword && hasContextKeyword) {
        return { isDesignRequest: true, prompt: message };
    }
    return { isDesignRequest: false, prompt: '' };
}

// Get or create ElizaOS session for a user
async function getOrCreateSession(userId: string, agentId: string): Promise<string | null> {
    // Check cache first
    const cached = sessionCache.get(userId);
    if (cached && new Date() < cached.expiresAt) {
        console.log('Using cached session:', cached.sessionId);
        return cached.sessionId;
    }

    // Create new session
    try {
        console.log(`Creating session at: ${elizaUrl}/api/messaging/sessions`);
        const res = await fetch(`${elizaUrl}/api/messaging/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId, userId }),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error('Session creation failed:', res.status, errText);
            return null;
        }

        const data = await res.json();
        console.log('Session created successfully:', data);

        // Cache the session (default 1 hour expiry if not provided)
        const expiresAt = data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + 60 * 60 * 1000);
        sessionCache.set(userId, {
            sessionId: data.sessionId,
            expiresAt: new Date(expiresAt.getTime() - 5 * 60 * 1000) // 5 min buffer
        });

        return data.sessionId;
    } catch (e) {
        console.error('Session creation error:', e);
        return null;
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { message, userId, visionContext, attachedImage } = body;

        if (!message || !userId) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Check for design intent
        const designIntent = detectDesignIntent(message);
        if (designIntent.isDesignRequest) {
            console.log('Design intent detected:', message);
            return NextResponse.json({
                success: true,
                action: 'TRIGGER_DESIGN',
                designPrompt: designIntent.prompt,
                response: "I'll create a design based on what I see. Give me a moment... 🎨",
                attachedImage: attachedImage || null
            });
        }

        // Get agent ID
        const agentId = process.env.ELIZA_AGENT_ID || '16f68732-3783-05ea-b38a-ad1e1c7ea90c';

        // Get or create session
        const sessionId = await getOrCreateSession(userId, agentId);
        if (!sessionId) {
            return NextResponse.json({ error: 'Failed to create ElizaOS session' }, { status: 500 });
        }

        // Prepare message with optional vision context
        let finalMessage = message;
        if (visionContext) {
            finalMessage = `[VISION_CONTEXT: ${visionContext}]\n\nUser: ${message}`;
        }

        console.log(`Sending message to session: ${elizaUrl}/api/messaging/sessions/${sessionId}/messages`);

        // Send message via Sessions API
        const elizaRes = await fetch(`${elizaUrl}/api/messaging/sessions/${sessionId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: finalMessage,
                mode: 'sync'
            }),
        });

        if (!elizaRes.ok) {
            const errText = await elizaRes.text();
            console.error('Eliza Message Error:', elizaRes.status, errText);

            // If session expired, clear cache and retry once
            if (elizaRes.status === 404 || errText.includes('session')) {
                console.log('Session expired, clearing cache');
                sessionCache.delete(userId);
            }

            return NextResponse.json({
                error: `Eliza failed: ${elizaRes.status}`,
                details: errText.slice(0, 200)
            }, { status: 500 });
        }

        const elizaData = await elizaRes.json();
        console.log('ElizaOS Response:', elizaData);

        // Extract response text
        const responseText = elizaData.agentResponse?.text || elizaData.text || elizaData.content || '';

        if (responseText && !userId.startsWith('guest-')) {
            // Save AI response to Supabase for logged-in users
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
            response: responseText || "I received your message but couldn't generate a response.",
            sessionId
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

