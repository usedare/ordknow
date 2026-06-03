import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/knowledge/node/[id]/materials - Get source materials for a knowledge node
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

  // Get material links for this node
  const { data: links, error: linksError } = await supabase
    .from("node_material_links")
    .select("material_id")
    .eq("node_id", id);

  if (linksError) {
    return NextResponse.json({ error: linksError.message }, { status: 500 });
  }

  if (!links || links.length === 0) {
    return NextResponse.json([]);
  }

  // Get the actual materials
  const materialIds = links.map((link) => link.material_id);

  const { data: materials, error: materialsError } = await supabase
    .from("materials")
    .select("*")
    .in("id", materialIds)
    .eq("user_id", user.id);

  if (materialsError) {
    return NextResponse.json({ error: materialsError.message }, { status: 500 });
  }

  return NextResponse.json(materials || []);
}
