import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/knowledge/versions - Get all knowledge versions for current user
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("knowledge_versions")
    .select("id, version_number, summary, created_at")
    .eq("user_id", user.id)
    .order("version_number", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
