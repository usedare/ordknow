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
import { getAIRequestHeaders } from "@/lib/client-ai-config";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { Search } from "lucide-react";

/**
 * 工作台页面：把“原始素材”和“AI 体系化结果”放到同一个三栏界面里。
 *
 * 左栏：素材列表。
 * 中栏：素材输入、编辑、AI 单条解析结果。
 * 右栏：根据视图切换显示原始素材列表或知识体系树。
 *
 * 这是序知的核心使用场景：用户不用先整理，只管输入；AI 负责解析和体系化。
 */
export default function WorkspacePage() {
  const { toast } = useToast();
  // materials 是原始素材层；selectedMaterial/analysis 是当前正在查看的素材及其理解层结果。
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [analysis, setAnalysis] = useState<MaterialAnalysis | null>(null);
  // topics 是 AI 体系化视图的数据源，来自 /api/knowledge。
  const [topics, setTopics] = useState<Array<KnowledgeTopic & { children?: Array<KnowledgeTopic & { nodes?: KnowledgeNode[] }> }>>([]);
  const [activeView, setActiveView] = useState<"raw" | "systematized">("raw");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSystematizing, setIsSystematizing] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const fetchMaterials = useCallback(async () => {
    try {
      // 拉取当前用户的全部原始素材，页面筛选和选择都在前端完成。
      const res = await fetchWithTimeout("/api/materials");
      if (res.ok) {
        const data = await res.json();
        setMaterials(data);
      } else {
        toast("素材列表加载失败", "error");
      }
    } catch {
      toast("素材列表加载超时，请稍后重试", "error");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchKnowledge = useCallback(async () => {
    try {
      // 拉取 AI 已经生成的主题树；如果还没体系化，这里通常是空数组。
      const res = await fetchWithTimeout("/api/knowledge");
      if (res.ok) {
        const data = await res.json();
        setTopics(data);
      }
    } catch {
      // 知识树是工作台右侧辅助视图，加载失败不应阻断素材录入。
      setTopics([]);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
    fetchKnowledge();
  }, [fetchMaterials, fetchKnowledge]);

  const handleSelectMaterial = async (material: Material) => {
    setSelectedMaterial(material);
    try {
      const res = await fetchWithTimeout(`/api/materials/${material.id}`);
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis);
      }
    } catch {
      toast("素材详情加载超时", "error");
    }
  };

  const handleCreateMaterial = async (title: string, content: string) => {
    setIsCreating(true);
    try {
      const res = await fetchWithTimeout("/api/materials", {
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
      const res = await fetchWithTimeout(`/api/materials/${id}`, {
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
      const res = await fetchWithTimeout(`/api/materials/${id}`, { method: "DELETE" });
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
      // 分析只处理单条素材，完成后素材状态会从 pending 变成 analyzed。
      const model = localStorage.getItem("ordknow_model") || "deepseek-chat";
      const res = await fetchWithTimeout("/api/analyze", {
        method: "POST",
        headers: getAIRequestHeaders(),
        body: JSON.stringify({ material_id: id, model }),
      }, 60000);
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
      // 体系化会读取所有 analyzed 素材，重建整套知识体系。
      const model = localStorage.getItem("ordknow_model") || "deepseek-chat";
      const res = await fetchWithTimeout("/api/systematize", {
        method: "POST",
        headers: getAIRequestHeaders(),
        body: JSON.stringify({ model }),
      }, 120000);
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

  const handleNodeSelect = (_node: KnowledgeNode) => {
    // 工作台右侧只负责预览体系树；节点详情编辑集中在 /knowledge 页面处理。
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
