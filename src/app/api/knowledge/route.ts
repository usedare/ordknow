import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/knowledge - Get knowledge tree for current user
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get level 1 topics
  const { data: topics, error: topicsError } = await supabase
    .from("knowledge_topics")
    .select("*")
    .eq("user_id", user.id)
    .eq("level", 1)
    .order("sort_order", { ascending: true });

  if (topicsError) {
    return NextResponse.json({ error: topicsError.message }, { status: 500 });
  }

  // Get level 2 topics (children)
  const { data: children, error: childrenError } = await supabase
    .from("knowledge_topics")
    .select("*")
    .eq("user_id", user.id)
    .eq("level", 2)
    .order("sort_order", { ascending: true });

  if (childrenError) {
    return NextResponse.json({ error: childrenError.message }, { status: 500 });
  }

  // Get nodes
  const { data: nodes, error: nodesError } = await supabase
    .from("knowledge_nodes")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if (nodesError) {
    return NextResponse.json({ error: nodesError.message }, { status: 500 });
  }

  // Build tree structure
  const tree = (topics || []).map((topic) => ({
    ...topic,
    children: (children || [])
      .filter((child) => child.parent_id === topic.id)
      .map((child) => ({
        ...child,
        nodes: (nodes || []).filter((node) => node.topic_id === child.id),
      })),
  }));

  return NextResponse.json(tree);
}
