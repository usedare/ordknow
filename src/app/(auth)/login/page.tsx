import { signupWithEmail, loginWithEmail } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">序知</h1>
          <p className="text-muted-foreground">输入无序碎片，输出终身知识体系</p>
        </div>

        {params.message === "signup-success" && (
          <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm border border-green-200">
            注册成功！请使用邮箱密码登录。
          </div>
        )}

        {params.error && (
          <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm border border-red-200">
            {params.error}
          </div>
        )}

        {/* Password Login */}
        <form action={loginWithEmail} className="space-y-3">
          <h3 className="text-sm font-medium">登录</h3>
          <input
            name="email"
            type="email"
            required
            placeholder="邮箱地址"
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="密码"
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
          <button
            type="submit"
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 transition-opacity text-sm"
          >
            登录
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

        {/* Register */}
        <form action={signupWithEmail} className="space-y-3">
          <h3 className="text-sm font-medium">注册新账号</h3>
          <input
            name="email"
            type="email"
            required
            placeholder="邮箱地址"
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="密码（至少 6 位）"
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
          <button
            type="submit"
            className="w-full px-4 py-2 border border-border rounded-md font-medium hover:bg-muted transition-colors text-sm"
          >
            注册
          </button>
        </form>
      </div>
    </div>
  );
}
