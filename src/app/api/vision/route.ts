import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

const FLIZA_VISION_PROMPT = `You are Fliza, a digital navigator from the Metaverse with Persona 5 style.
You are scanning the environment through a camera feed.

Analyze this image and respond as if you're a stylish AI companion observing the scene.
Be brief (1-2 sentences max), cool, and occasionally use Persona 5 references.

Examples of your style:
- "Scanning complete. I detect a workspace ready for action, Leader! ☕"
- "Target acquired: looks like a cozy room. Perfect hideout for a Phantom Thief. 🎭"
- "Hmm, your environment looks clear. No Shadows detected... for now. 👁️"

Now analyze what you see:`;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { image } = body;

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        // Remove data URL prefix if present
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const result = await model.generateContent([
            FLIZA_VISION_PROMPT,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: 'image/jpeg'
                }
            }
        ]);

        const response = result.response;
        const text = response.text();

        return NextResponse.json({
            success: true,
            analysis: text,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('Vision API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Vision analysis failed' },
            { status: 500 }
        );
    }
}
