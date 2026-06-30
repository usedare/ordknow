/**
 * 登录和注册操作
 *
 * 这个文件处理用户的登录和注册请求。
 * 所有操作通过 Supabase Auth 完成，数据存储在 Supabase 云端。
 *
 * 流程：
 *   用户提交邮箱+密码 → 验证身份 → 创建会话 → 跳转到工作台
 */

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * 注册新账号
 *
 * 用户在注册表单填好邮箱和密码后，调用 Supabase 创建新用户。
 * 注册成功后跳回登录页，显示"注册成功"提示。
 */
export async function signupWithEmail(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // 调用 Supabase 注册
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/workspace`,
    },
  });

  if (error) {
    // 注册失败时，把错误信息显示在登录页
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  // 注册成功，跳回登录页
  redirect("/login?message=signup-success");
}

/**
 * 邮箱密码登录
 *
 * 用户提交邮箱和密码，Supabase 验证后创建登录会话。
 * 登录成功后跳转到工作台。
 */
export async function loginWithEmail(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // 调用 Supabase 验证账号密码
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // 登录失败（密码错误、账号不存在等）
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  // 登录成功，进入工作台
  redirect("/workspace");
}

/**
 * 退出登录
 *
 * 清除当前用户的登录会话，回到登录页。
 */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
