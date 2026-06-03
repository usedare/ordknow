import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/knowledge/nodes/all - Get all nodes for current user
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("knowledge_nodes")
    .select("id, title, content, topic_id, node_type")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
