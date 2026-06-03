import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/export - Export all user data as JSON
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all user data
    const [materialsRes, analysisRes, topicsRes, nodesRes, linksRes, versionsRes] = await Promise.all([
      supabase.from("materials").select("*").eq("user_id", user.id),
      supabase.from("material_analysis").select("*").eq("user_id", user.id),
      supabase.from("knowledge_topics").select("*").eq("user_id", user.id),
      supabase.from("knowledge_nodes").select("*").eq("user_id", user.id),
      supabase.from("node_material_links").select("*"),
      supabase.from("knowledge_versions").select("*").eq("user_id", user.id),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      materials: materialsRes.data || [],
      analyses: analysisRes.data || [],
      knowledge_topics: topicsRes.data || [],
      knowledge_nodes: nodesRes.data || [],
      node_material_links: linksRes.data || [],
      knowledge_versions: versionsRes.data || [],
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="ordknow-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}
