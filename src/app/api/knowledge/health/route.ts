import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface HealthIssue {
  type: "duplicate" | "orphan" | "empty_content";
  severity: "warning" | "info";
  title: string;
  description: string;
  node_ids?: string[];
}

// GET /api/knowledge/health - Run health check on knowledge base
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const issues: HealthIssue[] = [];

  // 1. 检查同一主题下的重复标题节点，提示用户合并或重命名。
  const { data: nodes } = await supabase
    .from("knowledge_nodes")
    .select("id, title, topic_id, content")
    .eq("user_id", user.id);

  if (nodes) {
    const titleMap = new Map<string, string[]>();
    for (const node of nodes) {
      const key = `${node.topic_id}::${node.title.toLowerCase().trim()}`;
      const ids = titleMap.get(key) || [];
      ids.push(node.id);
      titleMap.set(key, ids);
    }

    for (const [, ids] of titleMap) {
      if (ids.length > 1) {
        issues.push({
          type: "duplicate",
          severity: "warning",
          title: "重复节点",
          description: `发现 ${ids.length} 个标题相同的节点`,
          node_ids: ids,
        });
      }
    }
  }

  // 2. 检查没有来源素材的节点。序知要求 AI 输出必须能追溯到原始素材。
  const { data: links } = await supabase
    .from("node_material_links")
    .select("node_id");

  const nodesWithSources = new Set(links?.map((l) => l.node_id) || []);

  if (nodes) {
    const orphanNodes = nodes.filter((n) => !nodesWithSources.has(n.id));
    if (orphanNodes.length > 0) {
      issues.push({
        type: "orphan",
        severity: "info",
        title: "孤儿节点",
        description: `发现 ${orphanNodes.length} 个没有来源素材的节点`,
        node_ids: orphanNodes.map((n) => n.id),
      });
    }
  }

  // 3. 检查空内容节点。这类节点通常来自 AI 输出不完整或人工编辑误删。
  if (nodes) {
    const emptyNodes = nodes.filter((n) => !n.content || !n.content.trim());
    if (emptyNodes.length > 0) {
      issues.push({
        type: "empty_content",
        severity: "info",
        title: "空内容节点",
        description: `发现 ${emptyNodes.length} 个没有正文内容的节点`,
        node_ids: emptyNodes.map((n) => n.id),
      });
    }
  }

  return NextResponse.json({
    checked_at: new Date().toISOString(),
    total_nodes: nodes?.length || 0,
    issues,
    is_healthy: issues.filter((i) => i.severity === "warning").length === 0,
  });
}
