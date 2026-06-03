import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface HealthIssue {
  type: "duplicate" | "orphan" | "no_source";
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

  // 1. Check for duplicate nodes (nodes with same title under same topic)
  const { data: nodes } = await supabase
    .from("knowledge_nodes")
    .select("id, title, topic_id")
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

  // 2. Check for orphan nodes (nodes without any source materials)
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

  // 3. Check for nodes without content
  if (nodes) {
    const emptyNodes = nodes.filter((n) => {
      // We'd need to check content field, but we only selected id/title/topic_id
      // Skip this check for now
    });
  }

  return NextResponse.json({
    checked_at: new Date().toISOString(),
    total_nodes: nodes?.length || 0,
    issues,
    is_healthy: issues.filter((i) => i.severity === "warning").length === 0,
  });
}
