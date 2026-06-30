import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeMaterial } from "@/lib/ai/analyze";
import { generateEmbeddings } from "@/lib/embeddings/client";
import { chunkText } from "@/lib/embeddings/chunk";
import { getAIKeyOverrides, getEmbeddingKeyOverride } from "@/lib/ai/request";

/**
 * 素材解析 API：把一条 raw material 变成“可被体系化使用的理解层数据”。
 *
 * 完整流程：
 * 1. 校验登录用户，并读取该用户自己的素材。
 * 2. 将素材状态改为 analyzing。
 * 3. 并行执行两件事：
 *    - 调用大模型生成结构化解析，写入 material_analysis。
 *    - 将长文本切块并生成 embedding，写入 material_chunks。
 * 4. 成功后标记 analyzed；失败后标记 failed。
 *
 * 注意：embedding 是增强能力，失败时不会阻断 AI 解析。
 */

// POST /api/analyze - Analyze a single material with AI
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { material_id, model } = body;
  const aiKeys = getAIKeyOverrides(request);
  const embeddingKey = getEmbeddingKeyOverride(request);

  if (!material_id) {
    return NextResponse.json({ error: "material_id is required" }, { status: 400 });
  }

  // Get the material
  const { data: material, error: materialError } = await supabase
    .from("materials")
    .select("*")
    .eq("id", material_id)
    .eq("user_id", user.id)
    .single();

  if (materialError || !material) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  // Update status to analyzing
  await supabase
    .from("materials")
    .update({ status: "analyzing" })
    .eq("id", material_id);

  try {
    const embeddingTask = (async () => {
        const chunks = chunkText(material.raw_content);
        if (chunks.length > 0) {
          const embeddings = await generateEmbeddings(chunks, embeddingKey);

          // Delete existing chunks (in case of re-analysis)
          await supabase
            .from("material_chunks")
            .delete()
            .eq("material_id", material.id);

          // Save new chunks
          const chunkRecords = chunks.map((content, index) => ({
            material_id: material.id,
            user_id: user.id,
            chunk_index: index,
            content,
            embedding: embeddings[index],
          }));

          await supabase.from("material_chunks").insert(chunkRecords);
        }
    })().catch((error) => {
      // 向量是增强能力；缺少 embedding 配置时，不应阻断基础 AI 解析闭环。
      console.warn("Embedding generation skipped:", error);
    });

    // AI 解析和向量生成互不依赖，可以并行执行以降低等待时间。
    const [analysisResult] = await Promise.all([
      analyzeMaterial(material.raw_content, model, aiKeys),
      embeddingTask,
    ]);

    // 重复解析时先删除旧理解层结果，保证每条素材只有最新解析版本。
    await supabase
      .from("material_analysis")
      .delete()
      .eq("material_id", material.id);

    // Save analysis
    const { error: insertError } = await supabase
      .from("material_analysis")
      .insert({
        material_id: material.id,
        user_id: user.id,
        core_meaning: analysisResult.core_meaning,
        useful_points: analysisResult.useful_points,
        redundant_points: analysisResult.redundant_points,
        topics: analysisResult.topics,
        knowledge_type: analysisResult.knowledge_type,
        keywords: analysisResult.keywords,
        related_hints: analysisResult.related_hints,
        ai_model: model || "deepseek-chat",
      });

    if (insertError) {
      throw insertError;
    }

    // Update status to analyzed
    await supabase
      .from("materials")
      .update({ status: "analyzed" })
      .eq("id", material_id);

    return NextResponse.json({ success: true, analysis: analysisResult });
  } catch (error) {
    console.error("Analysis failed:", error);

    // Update status to failed
    await supabase
      .from("materials")
      .update({ status: "failed" })
      .eq("id", material_id);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
