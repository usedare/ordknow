import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { systematizeMaterials } from "@/lib/ai/systematize";
import { getAIKeyOverrides } from "@/lib/ai/request";

/**
 * 体系化 API：序知的核心闭环。
 *
 * 它不是“总结全文”，而是把已经解析过的素材重新编译成：
 * - knowledge_topics：一级/二级主题
 * - knowledge_nodes：具体知识节点
 * - node_material_links：节点到原始素材的证据引用
 * - knowledge_edges：节点之间的知识关联
 * - knowledge_versions：本次重构快照
 *
 * 当前策略是全量重建：每次“一键体系化”都会清空当前用户旧知识网络，再写入新版。
 * 这样实现简单、可控，适合 MVP；后续可以升级为增量合并。
 */

// POST /api/systematize - Trigger knowledge systematization
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { model } = body;
  const aiKeys = getAIKeyOverrides(request);

  // Create reconstruction job
  const { data: job, error: jobError } = await supabase
    .from("reconstruction_jobs")
    .insert({
      user_id: user.id,
      status: "running",
      scope: "full",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }

  try {
    // 只使用“已解析”的素材进行体系化，避免把未理解的原始噪声直接送入重构层。
    const { data: materials, error: materialsError } = await supabase
      .from("materials")
      .select(`
        id,
        title,
        raw_content,
        material_analysis (
          core_meaning,
          useful_points,
          topics,
          knowledge_type,
          keywords
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "analyzed")
      .order("created_at", { ascending: true });

    if (materialsError) throw materialsError;

    if (!materials || materials.length === 0) {
      await supabase
        .from("reconstruction_jobs")
        .update({
          status: "failed",
          error_message: "没有已解析的素材可用于体系化",
          finished_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      return NextResponse.json(
        { error: "没有已解析的素材可用于体系化" },
        { status: 400 }
      );
    }

    // MVP 阶段限制一次重构的素材数量，避免上下文过长导致模型失败或成本失控。
    const materialsToProcess = materials.slice(0, 100);

    // 将原始素材和理解层结果编译成模型输入，来源 ID 会被要求回填到知识节点。
    const materialsData = materialsToProcess.map((m, index) => {
      const analysis = Array.isArray(m.material_analysis)
        ? m.material_analysis[0]
        : m.material_analysis;

      return `--- 素材 ${index + 1} (ID: ${m.id}) ---
标题: ${m.title || "无标题"}
内容: ${m.raw_content}
${analysis ? `
核心含义: ${analysis.core_meaning}
主题: ${Array.isArray(analysis.topics) ? analysis.topics.join(", ") : ""}
类型: ${analysis.knowledge_type}
关键词: ${Array.isArray(analysis.keywords) ? analysis.keywords.join(", ") : ""}
` : ""}
---`;
    }).join("\n\n");

    const result = await systematizeMaterials(materialsData, model, aiKeys);

    // 当前实现采用“全量重建”：先清空当前用户的知识网络，再写入新版主题树。
    // node_material_links 会随 knowledge_nodes 级联删除，不需要单独按假条件删除。
    await supabase.from("knowledge_edges").delete().eq("user_id", user.id);
    await supabase.from("knowledge_nodes").delete().eq("user_id", user.id);
    await supabase.from("knowledge_topics").delete().eq("user_id", user.id);

    // Get next version number
    const { data: lastVersion } = await supabase
      .from("knowledge_versions")
      .select("version_number")
      .eq("user_id", user.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    const nextVersionNumber = (lastVersion?.version_number || 0) + 1;

    // 按“一级主题 → 二级分支 → 知识节点 → 来源引用”的顺序落库。
    for (const topic of result.topics) {
      // 一级主题：例如“Python 学习”“工作复盘”“产品思考”。
      const { data: topicRecord, error: topicError } = await supabase
        .from("knowledge_topics")
        .insert({
          user_id: user.id,
          title: topic.title,
          description: topic.description,
          level: 1,
          sort_order: result.topics.indexOf(topic),
        })
        .select()
        .single();

      if (topicError) throw topicError;

      for (const child of topic.children || []) {
        // 二级分支：一级主题下面的具体维度，例如“基础语法”“项目经验”。
        const { data: childRecord, error: childError } = await supabase
          .from("knowledge_topics")
          .insert({
            user_id: user.id,
            parent_id: topicRecord.id,
            title: child.title,
            description: child.description,
            level: 2,
            sort_order: (topic.children || []).indexOf(child),
          })
          .select()
          .single();

        if (childError) throw childError;

        for (const node of child.nodes || []) {
          // 知识节点：用户真正阅读和复用的最小知识单元。
          const { data: nodeRecord, error: nodeError } = await supabase
            .from("knowledge_nodes")
            .insert({
              user_id: user.id,
              topic_id: childRecord.id,
              title: node.title,
              content: node.content,
              node_type: node.node_type,
              sort_order: (child.nodes || []).indexOf(node),
            })
            .select()
            .single();

          if (nodeError) throw nodeError;

          // 每个知识节点都必须保留来源素材引用，这是防止 AI 编造的核心约束。
          if (node.source_material_ids && node.source_material_ids.length > 0) {
            const links = node.source_material_ids.map((materialId: string) => ({
              node_id: nodeRecord.id,
              material_id: materialId,
              relevance_score: 1,
            }));

            await supabase.from("node_material_links").insert(links);
          }
        }
      }
    }

    // 基于共同来源素材自动建立 related 边，先实现稳定的知识网络最小闭环。
    const { data: createdNodes } = await supabase
      .from("knowledge_nodes")
      .select("id, topic_id")
      .eq("user_id", user.id);

    const { data: createdLinks } = await supabase
      .from("node_material_links")
      .select("node_id, material_id");

    if (createdNodes && createdLinks) {
      // material → nodes 映射：同一条素材支撑多个节点时，这些节点天然相关。
      const materialToNodes = new Map<string, string[]>();
      for (const link of createdLinks) {
        const nodes = materialToNodes.get(link.material_id) || [];
        nodes.push(link.node_id);
        materialToNodes.set(link.material_id, nodes);
      }

      // Create edges between nodes that share source materials
      const edgeSet = new Set<string>();
      const edges: Array<{
        user_id: string;
        source_node_id: string;
        target_node_id: string;
        edge_type: string;
        confidence: number;
      }> = [];

      for (const materialId of materialToNodes.keys()) {
        const nodeIds = materialToNodes.get(materialId)!;
        for (let i = 0; i < nodeIds.length; i++) {
          for (let j = i + 1; j < nodeIds.length; j++) {
            const [a, b] = nodeIds[i] < nodeIds[j]
              ? [nodeIds[i], nodeIds[j]]
              : [nodeIds[j], nodeIds[i]];
            const key = `${a}-${b}`;
            if (!edgeSet.has(key)) {
              edgeSet.add(key);
              edges.push({
                user_id: user.id,
                source_node_id: a,
                target_node_id: b,
                edge_type: "related",
                confidence: 0.8,
              });
            }
          }
        }
      }

      if (edges.length > 0) {
        await supabase.from("knowledge_edges").insert(edges);
      }
    }

    // Save version snapshot
    await supabase.from("knowledge_versions").insert({
      user_id: user.id,
      job_id: job.id,
      version_number: nextVersionNumber,
      snapshot: result,
      summary: result.summary,
    });

    // Update job status
    await supabase
      .from("reconstruction_jobs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        input_material_ids: materialsToProcess.map((m) => m.id),
      })
      .eq("id", job.id);

    return NextResponse.json({ success: true, job_id: job.id, version: nextVersionNumber });
  } catch (error) {
    console.error("Systematization failed:", error);

    await supabase
      .from("reconstruction_jobs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        finished_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Systematization failed" },
      { status: 500 }
    );
  }
}

// GET /api/systematize - Get reconstruction jobs
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("reconstruction_jobs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
