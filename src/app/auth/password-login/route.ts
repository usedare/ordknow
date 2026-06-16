import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { email, password } = await request.json().catch(() => ({
    email: "",
    password: "",
  }));

  if (!email || !password) {
    return NextResponse.json({ error: "请输入邮箱和密码" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(email).trim(),
    password: String(password),
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "登录失败，请检查邮箱和密码" },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true });
}
