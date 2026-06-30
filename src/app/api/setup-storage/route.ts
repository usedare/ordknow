import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// POST /api/setup-storage - Create storage bucket
export async function POST() {
  // 这是部署初始化辅助接口。生产环境不开放，避免普通登录用户触发管理级操作。
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Storage setup is disabled in production" }, { status: 403 });
  }

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }

  // 创建 bucket 需要 Supabase service role；普通 anon 客户端通常没有权限。
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  const { data, error } = await serviceClient.storage.createBucket("ordknow-public", {
    public: true,
    fileSizeLimit: 50 * 1024 * 1024, // 50MB
  });

  if (error) {
    // If bucket already exists, that's fine
    if (error.message?.includes("already exists")) {
      return NextResponse.json({ success: true, message: "Bucket already exists" });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
