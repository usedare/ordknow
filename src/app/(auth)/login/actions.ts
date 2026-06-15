"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getCredentials(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect("/login?error=" + encodeURIComponent("请输入邮箱和密码"));
  }

  return { email, password };
}

export async function signupWithEmail(formData: FormData) {
  const supabase = await createClient();
  // Server Action 中做一层基础校验，避免空表单直接打到 Supabase Auth。
  const { email, password } = getCredentials(formData);

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/workspace`,
    },
  });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  redirect("/login?message=signup-success");
}

export async function loginWithEmail(formData: FormData) {
  const supabase = await createClient();
  const { email, password } = getCredentials(formData);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  redirect("/workspace");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
