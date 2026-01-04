import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// NOTE: .internal addresses are NOT accessible from Vercel or Localhost. Use the PUBLIC Railway URL.
const elizaUrl = process.env.ELIZA_URL || 'https://fliza-agent-production.up.railway.app';

const supabase = createClient(supabaseUrl, supabaseKey);

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

        // Prepare message text with optional vision context
        let finalMessage = message;
        if (visionContext) {
            finalMessage = `[VISION_CONTEXT: ${visionContext}]\n\nUser: ${message}`;
        }

        // Use a simple room ID based on user ID for persistent conversation
        const roomId = `room-${userId}`;

        console.log(`Sending message to ElizaOS: ${elizaUrl}/api/agents/${agentId}/message`);

        // Send message using the correct ElizaOS API format
        const elizaRes = await fetch(`${elizaUrl}/api/agents/${agentId}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: finalMessage,
                userId: userId,
                roomId: roomId
            }),
        });

        if (!elizaRes.ok) {
            const errText = await elizaRes.text();
            console.error('Eliza Message Error:', elizaRes.status, errText);
            return NextResponse.json({
                error: `Eliza failed: ${elizaRes.status}`,
                details: errText.slice(0, 200)
            }, { status: 500 });
        }

        const elizaData = await elizaRes.json();
        console.log('ElizaOS Response:', elizaData);

        // Extract response text - ElizaOS returns an array of messages
        // The response format is typically: [{ text: "...", user: "agent", ... }]
        let responseText = '';
        if (Array.isArray(elizaData) && elizaData.length > 0) {
            responseText = elizaData[0]?.text || elizaData[0]?.content || '';
        } else if (typeof elizaData === 'object') {
            responseText = elizaData.text || elizaData.content || elizaData.response || '';
        }

        if (responseText) {
            // Save AI response to Supabase (optional, for logged-in users)
            if (!userId.startsWith('guest-')) {
                const { error } = await supabase.from('messages').insert({
                    user_id: userId,
                    role: 'assistant',
                    content: responseText,
                    metadata: { roomId }
                });

                if (error) {
                    console.error('Supabase Write Error:', error);
                }
            }
        }

        return NextResponse.json({
            success: true,
            response: responseText || "I received your message but couldn't generate a response.",
            roomId
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
