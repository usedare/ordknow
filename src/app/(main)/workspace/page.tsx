"use client";

import { useState, useEffect, useCallback } from "react";
import { Material, MaterialAnalysis, KnowledgeTopic, KnowledgeNode } from "@/types";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { MaterialPanel } from "@/components/workspace/material-panel";
import { DetailPanel } from "@/components/workspace/detail-panel";
import { KnowledgePanel } from "@/components/workspace/knowledge-panel";
import { ViewToggle } from "@/components/workspace/view-toggle";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { SearchDialog } from "@/components/ui/search-dialog";
import { Search } from "lucide-react";

export default function WorkspacePage() {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [analysis, setAnalysis] = useState<MaterialAnalysis | null>(null);
  const [topics, setTopics] = useState<Array<KnowledgeTopic & { children?: Array<KnowledgeTopic & { nodes?: KnowledgeNode[] }> }>>([]);
  const [activeView, setActiveView] = useState<"raw" | "systematized">("raw");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSystematizing, setIsSystematizing] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const fetchMaterials = useCallback(async () => {
    const res = await fetch("/api/materials");
    if (res.ok) {
      const data = await res.json();
      setMaterials(data);
    }
    setIsLoading(false);
  }, []);

  const fetchKnowledge = useCallback(async () => {
    const res = await fetch("/api/knowledge");
    if (res.ok) {
      const data = await res.json();
      setTopics(data);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
    fetchKnowledge();
  }, [fetchMaterials, fetchKnowledge]);

  const handleSelectMaterial = async (material: Material) => {
    setSelectedMaterial(material);
    const res = await fetch(`/api/materials/${material.id}`);
    if (res.ok) {
      const data = await res.json();
      setAnalysis(data.analysis);
    }
  };

  const handleCreateMaterial = async (title: string, content: string) => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, raw_content: content }),
      });
      if (res.ok) {
        await fetchMaterials();
        toast("素材创建成功", "success");
      } else {
        toast("创建失败", "error");
      }
    } catch {
      toast("网络错误", "error");
    }
    setIsCreating(false);
  };

  const handleUpdateMaterial = async (id: string, title: string, content: string) => {
    try {
      const res = await fetch(`/api/materials/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, raw_content: content }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMaterials((prev) => prev.map((m) => (m.id === id ? updated : m)));
        if (selectedMaterial?.id === id) setSelectedMaterial(updated);
        toast("素材已更新", "success");
      }
    } catch {
      toast("网络错误", "error");
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      const res = await fetch(`/api/materials/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMaterials((prev) => prev.filter((m) => m.id !== id));
        if (selectedMaterial?.id === id) {
          setSelectedMaterial(null);
          setAnalysis(null);
        }
        toast("素材已删除", "success");
      }
    } catch {
      toast("网络错误", "error");
    }
  };

  const handleAnalyzeMaterial = async (id: string) => {
    toast("正在 AI 解析...", "info");
    try {
      const model = localStorage.getItem("ordknow_model") || "deepseek-chat";
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material_id: id, model }),
      });
      if (res.ok) {
        await fetchMaterials();
        if (selectedMaterial?.id === id) await handleSelectMaterial(selectedMaterial);
        toast("AI 解析完成", "success");
      } else {
        toast("解析失败", "error");
      }
    } catch {
      toast("网络错误", "error");
    }
  };

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
    } catch {
      toast("网络错误", "error");
    }
    setIsSystematizing(false);
  };

  const handleNodeSelect = (node: KnowledgeNode) => {
    console.log("Selected node:", node);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="h-full">
    <WorkspaceLayout
      toolbar={
        <>
          <Button size="sm" variant="outline" onClick={() => setIsSearchOpen(true)}>
            <Search className="w-4 h-4 mr-1" />
            搜索
          </Button>
          <Button size="sm" onClick={handleSystematize} disabled={isSystematizing}>
            {isSystematizing ? "体系化中..." : "一键体系化"}
          </Button>
          <ViewToggle activeView={activeView} onChange={setActiveView} />
          <div className="ml-auto text-xs text-muted-foreground">
            {materials.length} 条素材
          </div>
        </>
      }
      leftPanel={
        <MaterialPanel materials={materials} selectedId={selectedMaterial?.id} onSelect={handleSelectMaterial} />
      }
      middlePanel={
        <DetailPanel
          material={selectedMaterial}
          analysis={analysis}
          onCreate={handleCreateMaterial}
          onUpdate={handleUpdateMaterial}
          onDelete={handleDeleteMaterial}
          onAnalyze={handleAnalyzeMaterial}
          isCreating={isCreating}
        />
      }
      rightPanel={
        activeView === "systematized" ? (
          <KnowledgePanel topics={topics} onNodeSelect={handleNodeSelect} />
        ) : (
          <MaterialPanel materials={materials} selectedId={selectedMaterial?.id} onSelect={handleSelectMaterial} />
        )
      }
    />
    <SearchDialog
      isOpen={isSearchOpen}
      onClose={() => setIsSearchOpen(false)}
      onMaterialSelect={(id) => {
        const material = materials.find((m) => m.id === id);
        if (material) handleSelectMaterial(material);
      }}
    />
    </div>
  );
}
