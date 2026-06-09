import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIClient } from "@/lib/ai/client";

// POST /api/qa - Answer questions based on knowledge base
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { question, modelId, saveToKB, materials } = body;

  if (!question || !question.trim()) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  try {
    // Build context from provided materials
    let contextMaterials: string[] = [];

    if (materials && Array.isArray(materials) && materials.length > 0) {
      // Filter materials by keyword match
      const keywords = question.toLowerCase().split(/\s+/);
      contextMaterials = materials
        .filter((m: { raw_content: string }) => {
          const content = m.raw_content.toLowerCase();
          return keywords.some((kw: string) => content.includes(kw));
        })
        .map((m: { raw_content: string }) => m.raw_content)
        .slice(0, 5);

      // If no keyword match, include all materials
      if (contextMaterials.length === 0) {
        contextMaterials = materials.slice(0, 5).map((m: { raw_content: string }) => m.raw_content);
      }
    }

    // Build context string
    const context = contextMaterials.length > 0
      ? contextMaterials.map((m, i) => `来源素材 ${i + 1}:\n${m}`).join("\n\n")
      : "（知识库为空）";

    const { client, model } = getAIClient(modelId);

    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `你是"序知"的知识问答助手。你的任务是基于用户的知识库内容回答问题。

规则：
1. 只能基于提供的知识库内容回答，不要编造外部信息
2. 如果知识库中没有相关信息，明确告知用户
3. 回答要准确、清晰、有条理
4. 在回答中引用来源素材编号，如"根据素材1"
5. 如果问题需要进一步探索，可以建议用户查看更多相关素材`,
        },
        {
          role: "user",
          content: `知识库内容：
${context}

用户问题：${question}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    const answer = response.choices[0]?.message?.content || "无法生成回答";

    // Optionally save new insights to knowledge base
    let savedInsight = false;
    if (saveToKB && answer) {
      const { error: saveError } = await supabase
        .from("materials")
        .insert({
          user_id: user.id,
          title: `问答: ${question.slice(0, 50)}`,
          raw_content: `问题：${question}\n\n回答：${answer}`,
          source_type: "qa",
          status: "pending",
        });

      savedInsight = !saveError;
    }

    return NextResponse.json({
      answer,
      sources: contextMaterials.length,
      savedToKB: savedInsight,
    });
  } catch (error) {
    console.error("Q&A failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Q&A failed" },
      { status: 500 }
    );
  }
}
