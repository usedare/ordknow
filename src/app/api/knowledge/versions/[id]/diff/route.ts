import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/knowledge/versions/[id]/diff - Compare a version with current state
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the historical version
  const { data: version, error: versionError } = await supabase
    .from("knowledge_versions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (versionError || !version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  // Get current knowledge state
  const [topicsRes, nodesRes] = await Promise.all([
    supabase.from("knowledge_topics").select("id, title, level, parent_id").eq("user_id", user.id),
    supabase.from("knowledge_nodes").select("id, title, topic_id").eq("user_id", user.id),
  ]);

  const currentTopics = topicsRes.data || [];
  const currentNodes = nodesRes.data || [];

  // Parse historical snapshot
  const snapshot = version.snapshot as {
    topics?: Array<{
      title: string;
      children?: Array<{
        title: string;
        nodes?: Array<{ title: string; source_material_ids?: string[] }>;
      }>;
    }>;
  };

  const historicalTopics = snapshot.topics || [];

  // Build comparison
  const comparison = {
    version_number: version.version_number,
    created_at: version.created_at,
    summary: version.summary,
    historical: {
      topic_count: historicalTopics.length,
      branch_count: historicalTopics.reduce((sum, t) => sum + (t.children?.length || 0), 0),
      node_count: historicalTopics.reduce(
        (sum, t) => sum + (t.children?.reduce((s, c) => s + (c.nodes?.length || 0), 0) || 0),
        0
      ),
      topics: historicalTopics.map((t) => ({
        title: t.title,
        branches: t.children?.map((c) => ({
          title: c.title,
          node_count: c.nodes?.length || 0,
        })) || [],
      })),
    },
    current: {
      topic_count: currentTopics.filter((t) => t.level === 1).length,
      branch_count: currentTopics.filter((t) => t.level === 2).length,
      node_count: currentNodes.length,
    },
    changes: {
      topics_added: currentTopics.filter((t) => t.level === 1).length - historicalTopics.length,
      nodes_added: currentNodes.length - historicalTopics.reduce(
        (sum, t) => sum + (t.children?.reduce((s, c) => s + (c.nodes?.length || 0), 0) || 0),
        0
      ),
    },
  };

  return NextResponse.json(comparison);
}
