import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIClient } from "@/lib/ai/client";
import { getAIKeyOverrides } from "@/lib/ai/request";

/**
 * 知识问答 API。
 *
 * 这里的设计目标是：回答必须基于当前用户自己的知识库，不允许用户从前端提交任意“上下文”冒充事实来源。
 *
 * 当前 MVP 使用轻量关键词排序选出相关素材，后续可以替换为：
 * - material_chunks 的向量召回
 * - knowledge_nodes 的结构化召回
 * - 两者混合检索
 */

interface QAMaterial {
  id: string;
  title: string | null;
  raw_content: string;
  created_at: string;
}

function buildQuestionTerms(question: string) {
  const normalized = question.toLowerCase();
  const wordTerms = normalized
    .split(/[\s,，。！？；;:：、"'“”‘’（）()【】[\]{}<>《》]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);

  // 中文问题经常没有空格，补充连续 2 字片段能提高本地相关性排序的可用性。
  const chinesePairs = Array.from(normalized.matchAll(/[\u4e00-\u9fa5]{2}/g)).map((m) => m[0]);
  return Array.from(new Set([...wordTerms, ...chinesePairs])).slice(0, 20);
}

function pickRelevantMaterials(materials: QAMaterial[], question: string) {
  const terms = buildQuestionTerms(question);

  // 本地相关性排序：简单、可解释、无额外模型成本。
  const scored = materials.map((material) => {
    const haystack = `${material.title || ""}\n${material.raw_content}`.toLowerCase();
    const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
    return { material, score };
  });

  const matched = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.material);

  // 如果没有命中关键词，则退回到最近素材，保证新知识库也能回答“有哪些内容”类问题。
  return (matched.length > 0 ? matched : materials).slice(0, 8);
}

// POST /api/qa - Answer questions based on knowledge base
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { question, modelId, saveToKB } = body;
  const aiKeys = getAIKeyOverrides(request);

  if (!question || !question.trim()) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  try {
    // 后端自己读取当前登录用户的素材，避免让客户端提交“事实来源”。
    const { data: materials, error: materialsError } = await supabase
      .from("materials")
      .select("id, title, raw_content, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (materialsError) throw materialsError;

    const contextMaterials = pickRelevantMaterials((materials || []) as QAMaterial[], question);

    const context = contextMaterials.length > 0
      ? contextMaterials
          .map((m, i) => `来源素材 ${i + 1}（ID: ${m.id}，标题: ${m.title || "无标题"}）:\n${m.raw_content.slice(0, 3000)}`)
          .join("\n\n")
      : "（知识库为空）";

    const { client, model } = getAIClient(modelId, aiKeys);

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

    // 用户勾选后，把“问题 + 回答”作为新素材回存；后续仍需走解析/体系化流程。
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
