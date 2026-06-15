import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 素材 API：负责“原始素材层”的增查。
 *
 * 序知的基本原则是：用户输入的原始内容不能被 AI 覆盖。
 * 所以这里写入的是 raw_content 原文，后续 AI 解析结果会放到 material_analysis 表。
 */

// GET /api/materials - List all materials for current user
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  // 所有业务表都带 user_id；即使数据库有 RLS，服务端也显式按当前用户过滤。
  let query = supabase
    .from("materials")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/materials - Create a new material
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, raw_content, source_type = "manual" } = body;

  if (!raw_content || typeof raw_content !== "string" || !raw_content.trim()) {
    return NextResponse.json({ error: "raw_content is required" }, { status: 400 });
  }

  // 新素材只标记为 pending；是否解析、何时体系化由后续流程决定。
  const { data, error } = await supabase
    .from("materials")
    .insert({
      user_id: user.id,
      title: title || null,
      raw_content: raw_content.trim(),
      source_type,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
