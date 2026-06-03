import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIClient } from "@/lib/ai/client";

// POST /api/ocr - Extract text from image using multimodal AI
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { image, filename } = body;

  if (!image) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  try {
    const { client, model } = getAIClient();

    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `请识别这张图片中的所有文字内容。要求：
1. 完整提取所有文字，保持原始顺序
2. 如果有标题，提取为 suggestedTitle
3. 输出 JSON 格式: {"text": "识别出的文字", "suggestedTitle": "建议标题（可选）"}`,
            },
            {
              type: "image_url",
              image_url: {
                url: image,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(content);
    return NextResponse.json({
      text: result.text || "",
      suggestedTitle: result.suggestedTitle || filename?.replace(/\.\w+$/, "") || "",
    });
  } catch (error) {
    console.error("OCR failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OCR failed" },
      { status: 500 }
    );
  }
}
