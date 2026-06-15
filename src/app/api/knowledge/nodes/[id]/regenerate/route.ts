import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIClient } from "@/lib/ai/client";
import { getAIKeyOverrides } from "@/lib/ai/request";

// POST /api/knowledge/nodes/[id]/regenerate - Regenerate a node's content using AI
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { model } = body;
  const aiKeys = getAIKeyOverrides(request);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the current node
  const { data: node, error: nodeError } = await supabase
    .from("knowledge_nodes")
    .select("*, knowledge_topics!inner(id, title, description, level, parent_id)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (nodeError || !node) {
    return NextResponse.json({ error: "Node not found" }, { status: 404 });
  }

  // 重新生成必须基于节点的来源素材，避免 AI 脱离知识库自由发挥。
  const { data: links } = await supabase
    .from("node_material_links")
    .select("material_id, materials(raw_content, material_analysis(core_meaning, useful_points, topics, keywords))")
    .eq("node_id", id);

  const materialsContext = (links || [])
    .map((link: Record<string, unknown>) => {
      const material = link.materials as Record<string, unknown> | null;
      const analysis = material?.material_analysis as Record<string, unknown> | null;
      return `素材: ${material?.raw_content || ""}\n解析: ${analysis?.core_meaning || ""}`;
    })
    .join("\n\n");

  // Get topic context
  const topic = node.knowledge_topics as Record<string, unknown> | null;

  const prompt = `你正在重新生成一个知识节点的内容。

节点标题: ${node.title}
所属主题: ${topic?.title || ""}
主题描述: ${topic?.description || ""}
当前内容: ${node.content || "无"}

来源素材:
${materialsContext || "无来源素材"}

请基于来源素材，重新生成这个知识节点的内容。要求：
1. 内容要准确反映来源素材
2. 不要编造素材中没有的信息
3. 保持简洁清晰
4. 输出 JSON 格式: {"content": "新内容", "summary": "新摘要"}`;

  try {
    const { client, model: selectedModel } = getAIClient(model, aiKeys);
    const response = await client.chat.completions.create({
      model: selectedModel,
      messages: [
        { role: "system", content: "你是知识节点内容生成器。基于来源素材重新生成知识节点内容。" },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const aiContent = response.choices[0]?.message?.content;
    if (!aiContent) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(aiContent);

    // Update the node
    const { data: updated, error: updateError } = await supabase
      .from("knowledge_nodes")
      .update({
        content: result.content || node.content,
        summary: result.summary || node.summary,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Regenerate failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Regeneration failed" },
      { status: 500 }
    );
  }
}
