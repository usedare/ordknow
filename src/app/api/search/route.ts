import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/search?q=keyword - Search across materials and knowledge nodes
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ materials: [], nodes: [] });
  }

  const searchTerm = `%${query.trim()}%`;

  try {
    // Search materials
    const { data: materials } = await supabase
      .from("materials")
      .select("id, title, raw_content, status, created_at")
      .eq("user_id", user.id)
      .or(`title.ilike.${searchTerm},raw_content.ilike.${searchTerm}`)
      .order("created_at", { ascending: false })
      .limit(20);

    // Search knowledge nodes
    const { data: nodes } = await supabase
      .from("knowledge_nodes")
      .select("id, title, content, topic_id, node_type")
      .eq("user_id", user.id)
      .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
      .limit(20);

    // Search knowledge topics
    const { data: topics } = await supabase
      .from("knowledge_topics")
      .select("id, title, description, level")
      .eq("user_id", user.id)
      .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .limit(20);

    return NextResponse.json({
      materials: materials || [],
      nodes: nodes || [],
      topics: topics || [],
    });
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
