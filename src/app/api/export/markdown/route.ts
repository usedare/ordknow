import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/export/markdown - Export knowledge system as Markdown
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all knowledge data
    const [topicsRes, nodesRes, linksRes, materialsRes] = await Promise.all([
      supabase.from("knowledge_topics").select("*").eq("user_id", user.id).order("sort_order"),
      supabase.from("knowledge_nodes").select("*").eq("user_id", user.id).order("sort_order"),
      supabase.from("node_material_links").select("node_id, material_id"),
      supabase.from("materials").select("id, title, raw_content").eq("user_id", user.id),
    ]);

    const topics = topicsRes.data || [];
    const nodes = nodesRes.data || [];
    const links = linksRes.data || [];
    const materials = materialsRes.data || [];

    // Build Markdown
    let markdown = "# 个人知识体系\n\n";
    markdown += `> 导出时间：${new Date().toLocaleString("zh-CN")}\n`;
    markdown += `> 知识节点数：${nodes.length}\n`;
    markdown += `> 素材数：${materials.length}\n\n`;
    markdown += "---\n\n";

    // Group topics by level
    const level1Topics = topics.filter((t) => t.level === 1).sort((a, b) => a.sort_order - b.sort_order);

    for (const topic of level1Topics) {
      markdown += `## ${topic.title}\n\n`;
      if (topic.description) {
        markdown += `${topic.description}\n\n`;
      }

      // Get level 2 children
      const children = topics
        .filter((t) => t.parent_id === topic.id)
        .sort((a, b) => a.sort_order - b.sort_order);

      for (const child of children) {
        markdown += `### ${child.title}\n\n`;
        if (child.description) {
          markdown += `${child.description}\n\n`;
        }

        // Get nodes under this child
        const childNodes = nodes
          .filter((n) => n.topic_id === child.id)
          .sort((a, b) => a.sort_order - b.sort_order);

        for (const node of childNodes) {
          markdown += `#### ${node.title}\n\n`;
          if (node.content) {
            markdown += `${node.content}\n\n`;
          }
          if (node.summary) {
            markdown += `> 摘要：${node.summary}\n\n`;
          }

          // Get source materials
          const nodeLinks = links.filter((l) => l.node_id === node.id);
          if (nodeLinks.length > 0) {
            markdown += "**来源素材：**\n\n";
            for (const link of nodeLinks) {
              const material = materials.find((m) => m.id === link.material_id);
              if (material) {
                markdown += `- ${material.title || "无标题"}: ${material.raw_content.slice(0, 100)}${material.raw_content.length > 100 ? "..." : ""}\n`;
              }
            }
            markdown += "\n";
          }
        }
      }
    }

    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="ordknow-knowledge-${new Date().toISOString().split("T")[0]}.md"`,
      },
    });
  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}
