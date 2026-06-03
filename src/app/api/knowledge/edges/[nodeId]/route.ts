import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/knowledge/edges/[nodeId] - Get edges for a specific node
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const supabase = await createClient();
  const { nodeId } = await params;

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get edges where this node is source or target
  const { data: edges, error: edgesError } = await supabase
    .from("knowledge_edges")
    .select("*")
    .eq("user_id", user.id)
    .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`);

  if (edgesError) {
    return NextResponse.json({ error: edgesError.message }, { status: 500 });
  }

  if (!edges || edges.length === 0) {
    return NextResponse.json([]);
  }

  // Get the related node IDs
  const relatedNodeIds = edges.map((e) =>
    e.source_node_id === nodeId ? e.target_node_id : e.source_node_id
  );

  // Fetch the related nodes
  const { data: relatedNodes } = await supabase
    .from("knowledge_nodes")
    .select("*")
    .in("id", relatedNodeIds);

  // Merge edge info with node info
  const result = edges.map((edge) => {
    const relatedId = edge.source_node_id === nodeId ? edge.target_node_id : edge.source_node_id;
    const node = relatedNodes?.find((n) => n.id === relatedId);
    return {
      edge_type: edge.edge_type,
      description: edge.description,
      confidence: edge.confidence,
      node,
    };
  });

  return NextResponse.json(result);
}
