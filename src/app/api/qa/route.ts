import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIClient } from "@/lib/ai/client";
import { generateEmbeddings } from "@/lib/embeddings/client";

// POST /api/qa - Answer questions based on knowledge base
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { question, modelId, saveToKB } = body;

  if (!question || !question.trim()) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  try {
    // Step 1: Generate embedding for the question
    const [questionEmbedding] = await generateEmbeddings([question]);

    // Step 2: Search for relevant materials using vector similarity
    const { data: relevantChunks } = await supabase.rpc("match_chunks" as never, {
      query_embedding: questionEmbedding,
      match_count: 5,
      user_id: user.id,
    }).maybeSingle() as { data: Array<{ id: string; content: string }> | null };

    // Fallback: search by text if no chunks found or rpc fails
    let contextMaterials: string[] = [];

    if (relevantChunks && Array.isArray(relevantChunks) && relevantChunks.length > 0) {
      // Get the full material content for matched chunks
      const chunkIds = relevantChunks.map((c: { id: string }) => c.id);
      const { data: chunks } = await supabase
        .from("material_chunks")
        .select("content, material_id")
        .in("id", chunkIds);

      if (chunks) {
        contextMaterials = chunks.map((c: { content: string }) => c.content);
      }
    }

    // Fallback: search materials by text if no vector results
    if (contextMaterials.length === 0) {
      const { data: allMaterials } = await supabase
        .from("materials")
        .select("raw_content, user_id")
        .limit(50);

      if (allMaterials && allMaterials.length > 0) {
        // Simple keyword matching - search across all user's materials
        const keywords = question.toLowerCase().split(/\s+/);
        contextMaterials = allMaterials
          .filter((m: { raw_content: string; user_id: string }) => {
            const content = m.raw_content.toLowerCase();
            return keywords.some((kw: string) => content.includes(kw));
          })
          .map((m: { raw_content: string }) => m.raw_content)
          .slice(0, 5);
      }
    }

    // Step 3: Also get relevant knowledge nodes
    const { data: nodes } = await supabase
      .from("knowledge_nodes")
      .select("title, content, topic_id")
      .eq("user_id", user.id)
      .limit(10);

    let relevantNodes: string[] = [];
    if (nodes && nodes.length > 0) {
      // Simple text matching for nodes
      const questionLower = question.toLowerCase();
      relevantNodes = nodes
        .filter((n: { title: string; content: string | null }) =>
          n.title.toLowerCase().includes(questionLower) ||
          (n.content && n.content.toLowerCase().includes(questionLower))
        )
        .map((n: { title: string; content: string | null }) =>
          `[${n.title}] ${n.content || ""}`
        )
        .slice(0, 5);
    }

    // Step 4: Build context and generate answer
    const context = [
      ...contextMaterials.map((m, i) => `来源素材 ${i + 1}:\n${m}`),
      ...relevantNodes.map((n, i) => `知识节点 ${i + 1}:\n${n}`),
    ].join("\n\n");

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
${context || "（知识库为空，暂无相关内容）"}

用户问题：${question}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    const answer = response.choices[0]?.message?.content || "无法生成回答";

    // Step 5: Optionally save new insights to knowledge base
    let savedInsight = false;
    if (saveToKB && answer) {
      // Create a new material from the Q&A
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
      sources: contextMaterials.length + relevantNodes.length,
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
