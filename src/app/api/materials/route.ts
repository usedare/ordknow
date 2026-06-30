/**
 * 素材 API — 原始素材的增删改查
 *
 * "素材"就是用户输入的知识碎片：一段文字、一张图片识别出的内容、
 * 一份PDF的文本、一段录音的转写结果等。
 *
 * 序知的核心原则：原始素材永远保留，不被 AI 修改或覆盖。
 * AI 的解析结果存在另一张表（material_analysis），不会改动这里的原文。
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 查询素材列表
 *
 * 用户打开工作台或素材页时调用。
 * 返回当前登录用户的所有素材，按创建时间倒序排列。
 * 支持按状态筛选（如只看"待解析"的素材）。
 */
export async function GET(request: NextRequest) {
  // 创建 Supabase 服务端客户端（自动读取登录用户的 Cookie）
  const supabase = await createClient();

  // 验证用户身份：未登录返回 401
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 解析 URL 参数（如 ?status=pending）
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  // 查询数据：只查当前用户自己的素材
  // RLS（行级安全）策略也会自动过滤，但这里显式再过滤一层保证安全
  let query = supabase
    .from("materials")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // 如果传了状态参数，只返回该状态的素材
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * 新增素材
 *
 * 用户在工作台输入文本后点击"新增素材"时调用。
 * 素材创建后状态为 pending（待解析），用户需要手动触发 AI 解析。
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 验证用户身份
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 读取请求体中的标题、内容和来源类型
  const body = await request.json();
  const { title, raw_content, source_type = "manual" } = body;

  // 内容不能为空
  if (!raw_content || typeof raw_content !== "string" || !raw_content.trim()) {
    return NextResponse.json({ error: "raw_content is required" }, { status: 400 });
  }

  // 写入数据库：状态默认 pending（待解析）
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
