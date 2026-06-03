import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeMaterial } from "@/lib/ai/analyze";
import { generateEmbeddings } from "@/lib/embeddings/client";
import { chunkText } from "@/lib/embeddings/chunk";

// POST /api/analyze - Analyze a single material with AI
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { material_id, model } = body;

  if (!material_id) {
    return NextResponse.json({ error: "material_id is required" }, { status: 400 });
  }

  // Get the material
  const { data: material, error: materialError } = await supabase
    .from("materials")
    .select("*")
    .eq("id", material_id)
    .eq("user_id", user.id)
    .single();

  if (materialError || !material) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  // Update status to analyzing
  await supabase
    .from("materials")
    .update({ status: "analyzing" })
    .eq("id", material_id);

  try {
    // Run embedding and analysis in parallel
    const [analysisResult] = await Promise.all([
      // AI Analysis
      analyzeMaterial(material.raw_content, model),

      // Generate embeddings and save chunks
      (async () => {
        const chunks = chunkText(material.raw_content);
        if (chunks.length > 0) {
          const embeddings = await generateEmbeddings(chunks);

          // Delete existing chunks (in case of re-analysis)
          await supabase
            .from("material_chunks")
            .delete()
            .eq("material_id", material.id);

          // Save new chunks
          const chunkRecords = chunks.map((content, index) => ({
            material_id: material.id,
            user_id: user.id,
            chunk_index: index,
            content,
            embedding: embeddings[index],
          }));

          await supabase.from("material_chunks").insert(chunkRecords);
        }
      })(),
    ]);

    // Delete existing analysis (in case of re-analysis)
    await supabase
      .from("material_analysis")
      .delete()
      .eq("material_id", material.id);

    // Save analysis
    const { error: insertError } = await supabase
      .from("material_analysis")
      .insert({
        material_id: material.id,
        user_id: user.id,
        core_meaning: analysisResult.core_meaning,
        useful_points: analysisResult.useful_points,
        redundant_points: analysisResult.redundant_points,
        topics: analysisResult.topics,
        knowledge_type: analysisResult.knowledge_type,
        keywords: analysisResult.keywords,
        related_hints: analysisResult.related_hints,
        ai_model: model || "deepseek-chat",
      });

    if (insertError) {
      throw insertError;
    }

    // Update status to analyzed
    await supabase
      .from("materials")
      .update({ status: "analyzed" })
      .eq("id", material_id);

    return NextResponse.json({ success: true, analysis: analysisResult });
  } catch (error) {
    console.error("Analysis failed:", error);

    // Update status to failed
    await supabase
      .from("materials")
      .update({ status: "failed" })
      .eq("id", material_id);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
