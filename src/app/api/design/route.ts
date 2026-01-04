import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

export async function POST(request: NextRequest) {
    try {
        const { image, prompt } = await request.json();

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        // Clean base64 if it has data URL prefix
        const base64Data = image.includes('base64,')
            ? image.split('base64,')[1]
            : image;

        // Determine MIME type
        const mimeType = image.includes('image/png') ? 'image/png' : 'image/jpeg';

        const designPrompt = prompt || 'Create a stylized design based on this image. Make it visually appealing and creative.';

        // Call Nanobanana Pro (gemini-3-pro-image-preview)
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: [
                { text: designPrompt },
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Data
                    }
                }
            ]
        });

        // Extract the generated image from response
        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
            return NextResponse.json({ error: 'No response from image generation' }, { status: 500 });
        }

        const parts = candidates[0].content?.parts || [];
        let generatedImage: string | null = null;
        let responseText: string | null = null;

        for (const part of parts) {
            if (part.inlineData) {
                generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
            if (part.text) {
                responseText = part.text;
            }
        }

        if (!generatedImage) {
            return NextResponse.json({
                error: 'No image generated',
                text: responseText
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            image: generatedImage,
            text: responseText
        });

    } catch (error: any) {
        console.error('Design API Error:', error);
        return NextResponse.json({
            error: 'Failed to generate design',
            details: error.message
        }, { status: 500 });
    }
}
