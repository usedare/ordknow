"use client";

import { useState, useEffect } from "react";
import { KnowledgeNode, Material } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link2, Pencil, RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { getAIRequestHeaders } from "@/lib/client-ai-config";

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
  onNodeUpdate?: (node: KnowledgeNode) => void;
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

export function KnowledgeNodeDetail({ node, sourceMaterials, onNodeSelect, onNodeUpdate }: KnowledgeNodeDetailProps) {
  const { toast } = useToast();
  const [relatedNodes, setRelatedNodes] = useState<RelatedNode[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const [editContent, setEditContent] = useState(node.content || "");
  const [editSummary, setEditSummary] = useState(node.summary || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    setEditTitle(node.title);
    setEditContent(node.content || "");
    setEditSummary(node.summary || "");
    setIsEditing(false);
  }, [node.id]);

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/knowledge/nodes/${node.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          summary: editSummary,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setIsEditing(false);
        toast("节点已更新", "success");
        onNodeUpdate?.(updated);
      } else {
        toast("更新失败", "error");
      }
    } catch {
      toast("网络错误", "error");
    }
    setIsSaving(false);
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    toast("正在重新生成节点内容...", "info");
    try {
      const model = localStorage.getItem("ordknow_model") || "deepseek-chat";
      const res = await fetch(`/api/knowledge/nodes/${node.id}/regenerate`, {
        method: "POST",
        headers: getAIRequestHeaders(),
        body: JSON.stringify({ model }),
      });
      if (res.ok) {
        const updated = await res.json();
        toast("节点已重新生成", "success");
        onNodeUpdate?.(updated);
      } else {
        toast("重新生成失败", "error");
      }
    } catch {
      toast("网络错误", "error");
    }
    setIsRegenerating(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          {isEditing ? (
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-lg font-semibold" />
          ) : (
            <h3 className="text-lg font-semibold">{node.title}</h3>
          )}
          {node.node_type && (
            <Badge variant="outline" className="mt-1">{node.node_type}</Badge>
          )}
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "保存中..." : "保存"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>取消</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                <Pencil className="w-3.5 h-3.5 mr-1" />编辑
              </Button>
              <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={isRegenerating}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" />{isRegenerating ? "生成中..." : "重新生成"}
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">知识内容</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={6} />
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{node.content || "暂无内容"}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">摘要</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} rows={3} />
          ) : (
            <p className="text-sm text-muted-foreground">{node.summary || "暂无摘要"}</p>
          )}
        </CardContent>
      </Card>

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
              {/* 知识边来自体系化阶段的自动关联，用于体现 Karpathy 式“知识网络”能力。 */}
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
              {/* 来源素材是 AI 内容可信度的锚点：用户可以随时回看原始证据。 */}
              {sourceMaterials.map((material) => (
                <div key={material.id} className="p-2 rounded-md bg-muted text-sm">
                  <p className="font-medium">{material.title || "无标题"}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{material.raw_content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
