import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

const FLIZA_VISION_PROMPT = `You are Fliza, a digital navigator from the Metaverse with Persona 5 style.
You are scanning the environment through a camera feed.

Analyze this image and respond as if you're a stylish AI companion observing the scene.
IMPORTANT: If you see any TEXT in the image (especially on packaging, signs, or documents), generally describe what it says or transcribe the key parts so I can help translate or explain it if asked.

Be brief (1-2 sentences max), cool, and occasionally use Persona 5 references.

Examples:
- "Scanning complete. I see a coffee cup that says 'Starbucks'. Ready to fuel up, Leader? ☕"
- "Target acquired: A Japanese snack package. It says 'Matcha Flavor'. distinct and tasty! 🎭"
- "Hmm, environment clear. No text detected, just a cozy workspace. 👁️"

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

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

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
