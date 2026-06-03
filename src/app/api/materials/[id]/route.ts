import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/materials/[id] - Get material detail with analysis
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

  const { data: material, error: materialError } = await supabase
    .from("materials")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (materialError || !material) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  // Get latest analysis
  const { data: analysis } = await supabase
    .from("material_analysis")
    .select("*")
    .eq("material_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ ...material, analysis: analysis || null });
}

// PUT /api/materials/[id] - Update material
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, raw_content } = body;

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title || null;
  if (raw_content !== undefined) {
    if (!raw_content || !raw_content.trim()) {
      return NextResponse.json({ error: "raw_content cannot be empty" }, { status: 400 });
    }
    updateData.raw_content = raw_content.trim();
    // Reset status to pending if content changed
    updateData.status = "pending";
  }

  const { data, error } = await supabase
    .from("materials")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/materials/[id] - Delete material
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("materials")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
