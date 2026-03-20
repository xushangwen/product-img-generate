import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const { imageData, mimeType } = await request.json();

    if (!imageData) {
      return NextResponse.json({ error: "未提供图片数据" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key 未配置" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a professional commercial product photographer and photo retoucher specializing in industrial and mechanical equipment.

Your task: Transform the provided photo into a professional studio-quality product photograph.

STRICT REQUIREMENTS — follow every point exactly:

1. PRODUCT FIDELITY (MOST IMPORTANT): The product in your output must be IDENTICAL to the input image in every detail — shape, structure, components, labels, colors, proportions, textures, and design. Do NOT invent, add, remove, or modify ANY part of the product. This is a retouching job, not a creative redesign.

2. BACKGROUND: Replace the entire background with a clean, uniform light gray (#EBEBEB). The background must be flat and smooth — no gradients, no textures, no reflections on the background surface.

3. LIGHTING: Apply professional three-point studio lighting. Highlights should naturally reveal the product's material and surface texture. Shadows should be soft and minimal, appropriate for a clean catalog image.

4. IMAGE QUALITY: Crisp, sharp focus across the entire product. Zero noise. Maximum detail preservation. Photorealistic rendering indistinguishable from a professional camera capture.

5. COMPOSITION: Center the product within the frame. Leave balanced neutral space around all sides. Use a horizontal 5:3 aspect ratio (landscape orientation).

6. RETOUCHING STYLE: Professional industrial catalog photography — clean, precise, neutral. No artistic filters, no dramatic effects. The image should look like a high-end equipment catalog photo.

Output exactly one photorealistic image meeting all requirements above.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: imageData,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: "3:2",
          imageSize: "2K",
        },
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) {
      return NextResponse.json({ error: "模型未返回有效结果" }, { status: 500 });
    }

    let generatedImageData: string | null = null;
    let generatedMimeType = "image/png";

    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        generatedImageData = part.inlineData.data;
        generatedMimeType = part.inlineData.mimeType ?? "image/png";
        break;
      }
    }

    if (!generatedImageData) {
      const textParts = candidate.content.parts
        .filter((p) => p.text)
        .map((p) => p.text)
        .join(" ");
      return NextResponse.json(
        { error: `未能生成图像。模型回复: ${textParts || "无"}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageData: generatedImageData,
      mimeType: generatedMimeType,
    });
  } catch (error: unknown) {
    console.error("Gemini API error:", error);
    const message =
      error instanceof Error ? error.message : "未知错误，请重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
