"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface LoginFormProps {
  initialError?: string;
  initialMessage?: string;
}

/**
 * 登录页表单。
 *
 * 之前登录走 Server Action，由 Vercel 服务端去请求 Supabase Auth。
 * 线上实测时该链路返回 fetch failed，所以这里改为浏览器端登录：
 * Supabase SSR 客户端会把会话写进浏览器 Cookie，随后 proxy.ts 能读取会话并放行主应用页面。
 */
export function LoginForm({ initialError, initialMessage }: LoginFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [error, setError] = useState(initialError || "");
  const [message, setMessage] = useState(initialMessage || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });

    setIsSubmitting(false);

    if (loginError) {
      setError(loginError.message || "登录失败，请检查邮箱和密码");
      return;
    }

    router.push("/workspace");
    router.refresh();
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const { error: signupError } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword,
    });

    setIsSubmitting(false);

    if (signupError) {
      setError(signupError.message || "注册失败，请稍后重试");
      return;
    }

    setSignupEmail("");
    setSignupPassword("");
    setMessage("注册成功！请使用邮箱密码登录。");
  }

  return (
    <div className="w-full max-w-md p-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">序知</h1>
        <p className="text-muted-foreground">输入无序碎片，输出终身知识体系</p>
      </div>

      {message && (
        <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm border border-green-200">
          {message}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-3">
        <h3 className="text-sm font-medium">登录</h3>
        <input
          name="email"
          type="email"
          required
          placeholder="邮箱地址"
          value={loginEmail}
          onChange={(event) => setLoginEmail(event.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="密码"
          value={loginPassword}
          onChange={(event) => setLoginPassword(event.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 transition-opacity text-sm disabled:opacity-60"
        >
          {isSubmitting ? "登录中..." : "登录"}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-2 text-muted-foreground">或</span>
        </div>
      </div>

      <form onSubmit={handleSignup} className="space-y-3">
        <h3 className="text-sm font-medium">注册新账号</h3>
        <input
          name="email"
          type="email"
          required
          placeholder="邮箱地址"
          value={signupEmail}
          onChange={(event) => setSignupEmail(event.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
        />
        <input
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="密码（至少 6 位）"
          value={signupPassword}
          onChange={(event) => setSignupPassword(event.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-2 border border-border rounded-md font-medium hover:bg-muted transition-colors text-sm disabled:opacity-60"
        >
          {isSubmitting ? "注册中..." : "注册"}
        </button>
      </form>
    </div>
  );
}
