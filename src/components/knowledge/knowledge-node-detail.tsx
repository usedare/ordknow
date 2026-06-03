"use client";

import { useState, useEffect } from "react";
import { KnowledgeNode, Material, KnowledgeEdge } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link2 } from "lucide-react";

interface RelatedNode {
  edge_type: string;
  description: string | null;
  confidence: number;
  node: KnowledgeNode | null;
}

interface KnowledgeNodeDetailProps {
  node: KnowledgeNode;
  sourceMaterials?: Material[];
  onNodeSelect?: (node: KnowledgeNode) => void;
}

const edgeTypeLabels: Record<string, string> = {
  related: "相关",
  prerequisite: "前置知识",
  supports: "支撑",
  contradicts: "矛盾",
  extends: "延伸",
  example_of: "示例",
  part_of: "隶属",
  duplicate: "近似重复",
};

export function KnowledgeNodeDetail({ node, sourceMaterials, onNodeSelect }: KnowledgeNodeDetailProps) {
  const [relatedNodes, setRelatedNodes] = useState<RelatedNode[]>([]);

  useEffect(() => {
    const fetchEdges = async () => {
      const res = await fetch(`/api/knowledge/edges/${node.id}`);
      if (res.ok) {
        const data = await res.json();
        setRelatedNodes(data);
      }
    };
    fetchEdges();
  }, [node.id]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{node.title}</h3>
        {node.node_type && (
          <Badge variant="outline" className="mt-1">
            {node.node_type}
          </Badge>
        )}
      </div>

      {node.content && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">知识内容</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {node.content}
            </div>
          </CardContent>
        </Card>
      )}

      {node.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">摘要</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{node.summary}</p>
          </CardContent>
        </Card>
      )}

      {relatedNodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              相关节点 ({relatedNodes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {relatedNodes.map((related) => (
                <button
                  key={related.node?.id}
                  onClick={() => related.node && onNodeSelect?.(related.node)}
                  className="w-full text-left p-2 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{related.node?.title}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {edgeTypeLabels[related.edge_type] || related.edge_type}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {sourceMaterials && sourceMaterials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">来源素材 ({sourceMaterials.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sourceMaterials.map((material) => (
                <div
                  key={material.id}
                  className="p-2 rounded-md bg-muted text-sm"
                >
                  <p className="font-medium">{material.title || "无标题"}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {material.raw_content}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
