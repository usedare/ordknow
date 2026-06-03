"use client";

import { useState, useEffect, useCallback } from "react";
import { KnowledgeTopic, KnowledgeNode, KnowledgeEdge, Material } from "@/types";
import { KnowledgeTree } from "@/components/knowledge/knowledge-tree";
import { KnowledgeNodeDetail } from "@/components/knowledge/knowledge-node-detail";
import { KnowledgeGraph } from "@/components/knowledge/knowledge-graph";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, Info, GitBranch } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface HealthIssue {
  type: "duplicate" | "orphan" | "no_source";
  severity: "warning" | "info";
  title: string;
  description: string;
  node_ids?: string[];
}

interface HealthReport {
  checked_at: string;
  total_nodes: number;
  issues: HealthIssue[];
  is_healthy: boolean;
}

export default function KnowledgePage() {
  const { toast } = useToast();
  const [topics, setTopics] = useState<Array<KnowledgeTopic & { children?: Array<KnowledgeTopic & { nodes?: KnowledgeNode[] }> }>>([]);
  const [allNodes, setAllNodes] = useState<KnowledgeNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [sourceMaterials, setSourceMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSystematizing, setIsSystematizing] = useState(false);
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [edges, setEdges] = useState<KnowledgeEdge[]>([]);
  const [viewMode, setViewMode] = useState<"tree" | "graph">("tree");

  const fetchKnowledge = useCallback(async () => {
    try {
      const [topicsRes, edgesRes, nodesRes] = await Promise.all([
        fetch("/api/knowledge"),
        fetch("/api/knowledge/edges/all"),
        fetch("/api/knowledge/nodes/all"),
      ]);
      if (topicsRes.ok) {
        const data = await topicsRes.json();
        setTopics(data);
      }
      if (edgesRes.ok) {
        const data = await edgesRes.json();
        setEdges(data);
      }
      if (nodesRes.ok) {
        const data = await nodesRes.json();
        setAllNodes(data);
      }
    } catch (err) {
      console.error("Failed to fetch knowledge:", err);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchKnowledge();
  }, [fetchKnowledge]);

  const handleSystematize = async () => {
    setIsSystematizing(true);
    toast("正在生成知识体系，可能需要一些时间...", "info");
    try {
      const model = localStorage.getItem("ordknow_model") || "deepseek-chat";
      const res = await fetch("/api/systematize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });
      if (res.ok) {
        await fetchKnowledge();
        toast("知识体系生成完成！", "success");
      } else {
        const data = await res.json();
        toast(data.error || "体系化失败", "error");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "体系化失败", "error");
    }
    setIsSystematizing(false);
  };

  const handleHealthCheck = async () => {
    setIsChecking(true);
    try {
      const res = await fetch("/api/knowledge/health");
      if (res.ok) {
        const data = await res.json();
        setHealthReport(data);
        if (data.is_healthy) {
          toast("知识库状态健康", "success");
        } else {
          toast(`发现 ${data.issues.length} 个问题`, "info");
        }
      }
    } catch (err) {
      toast("健康检查失败", "error");
    }
    setIsChecking(false);
  };

  const handleNodeSelect = async (node: KnowledgeNode) => {
    setSelectedNode(node);
    try {
      const res = await fetch(`/api/knowledge/node/${node.id}/materials`);
      if (res.ok) {
        const data = await res.json();
        setSourceMaterials(data);
      }
    } catch (err) {
      console.error("Failed to fetch source materials:", err);
    }
  };

  const handleNodeUpdate = (updated: KnowledgeNode) => {
    setSelectedNode(updated);
    // Refresh the knowledge tree
    fetchKnowledge();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">知识体系</h2>
            <Button size="sm" onClick={handleSystematize} disabled={isSystematizing}>
              {isSystematizing ? "体系化中..." : "一键体系化"}
            </Button>
          </div>
          <div className="flex gap-1 mb-2">
            <Button size="sm" variant={viewMode === "tree" ? "default" : "outline"} onClick={() => setViewMode("tree")} className="flex-1">
              树状
            </Button>
            <Button size="sm" variant={viewMode === "graph" ? "default" : "outline"} onClick={() => setViewMode("graph")} className="flex-1">
              <GitBranch className="w-3.5 h-3.5 mr-1" />
              图谱
            </Button>
          </div>
          <Button size="sm" variant="outline" onClick={handleHealthCheck} disabled={isChecking} className="w-full">
            <Activity className="w-4 h-4 mr-1.5" />
            {isChecking ? "检查中..." : "健康检查"}
          </Button>
        </div>

        {healthReport && (
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium">健康状态</span>
              <Badge variant={healthReport.is_healthy ? "success" : "warning"}>
                {healthReport.is_healthy ? "健康" : "有问题"}
              </Badge>
            </div>
            {healthReport.issues.length > 0 ? (
              <div className="space-y-1.5">
                {healthReport.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs">
                    {issue.severity === "warning" ? (
                      <AlertTriangle className="w-3 h-3 mt-0.5 text-yellow-600 shrink-0" />
                    ) : (
                      <Info className="w-3 h-3 mt-0.5 text-blue-600 shrink-0" />
                    )}
                    <span>{issue.description}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">未发现问题</p>
            )}
          </div>
        )}

        <div className="flex-1 overflow-auto p-2">
          {viewMode === "tree" ? (
            <KnowledgeTree topics={topics} onNodeSelect={handleNodeSelect} selectedNodeId={selectedNode?.id} />
          ) : (
            <KnowledgeGraph nodes={allNodes} edges={edges} onNodeClick={handleNodeSelect} />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {selectedNode ? (
          <KnowledgeNodeDetail node={selectedNode} sourceMaterials={sourceMaterials} onNodeSelect={handleNodeSelect} onNodeUpdate={handleNodeUpdate} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">选择一个知识节点查看详情</div>
        )}
      </div>
    </div>
  );
}
