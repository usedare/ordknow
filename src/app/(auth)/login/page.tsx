import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoginForm
        initialError={params.error}
        initialMessage={params.message === "signup-success" ? "注册成功！请使用邮箱密码登录。" : undefined}
      />
    </div>
  );
}
