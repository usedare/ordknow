import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/setup-storage - Create storage bucket
export async function POST() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Try to create the bucket
  const { data, error } = await supabase.storage.createBucket("ordknow-public", {
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
