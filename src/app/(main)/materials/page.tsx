"use client";

import { useState, useEffect, useCallback } from "react";
import { Material, MaterialAnalysis, MaterialStatus } from "@/types";
import { MaterialInput } from "@/components/materials/material-input";
import { MaterialList } from "@/components/materials/material-list";
import { MaterialDetail } from "@/components/materials/material-detail";
import { useToast } from "@/components/ui/toast";
import { getAIRequestHeaders } from "@/lib/client-ai-config";

const STATUS_OPTIONS: Array<{ value: MaterialStatus | "all"; label: string }> = [
  { value: "all", label: "全部状态" },
  { value: "pending", label: "待解析" },
  { value: "analyzing", label: "解析中" },
  { value: "analyzed", label: "已解析" },
  { value: "failed", label: "解析失败" },
];

export default function MaterialsPage() {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [analysis, setAnalysis] = useState<MaterialAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MaterialStatus | "all">("all");

  const fetchMaterials = useCallback(async () => {
    const res = await fetch("/api/materials");
    if (res.ok) {
      const data = await res.json();
      setMaterials(data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleSelect = async (material: Material) => {
    setSelectedMaterial(material);
    const res = await fetch(`/api/materials/${material.id}`);
    if (res.ok) {
      const data = await res.json();
      setAnalysis(data.analysis);
    }
  };

  const handleCreate = async (title: string, content: string) => {
    setIsSubmitting(true);
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
        const data = await res.json();
        toast(data.error || "创建失败", "error");
      }
    } catch {
      toast("网络错误，请重试", "error");
    }
    setIsSubmitting(false);
  };

  const handleUpdate = async (id: string, title: string, content: string) => {
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
      } else {
        toast("更新失败", "error");
      }
    } catch {
      toast("网络错误，请重试", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/materials/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMaterials((prev) => prev.filter((m) => m.id !== id));
        if (selectedMaterial?.id === id) {
          setSelectedMaterial(null);
          setAnalysis(null);
        }
        toast("素材已删除", "success");
      } else {
        toast("删除失败", "error");
      }
    } catch {
      toast("网络错误，请重试", "error");
    }
  };

  const handleAnalyze = async (id: string) => {
    toast("正在 AI 解析...", "info");
    try {
      const model = localStorage.getItem("ordknow_model") || "deepseek-chat";
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: getAIRequestHeaders(),
        body: JSON.stringify({ material_id: id, model }),
      });
      if (res.ok) {
        await fetchMaterials();
        if (selectedMaterial?.id === id) await handleSelect(selectedMaterial);
        toast("AI 解析完成", "success");
      } else {
        const data = await res.json();
        toast(data.error || "解析失败", "error");
      }
    } catch {
      toast("网络错误，请重试", "error");
    }
  };

  const filteredMaterials = statusFilter === "all"
    ? materials
    : materials.filter((m) => m.status === statusFilter);

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
          <h2 className="font-semibold mb-3">新增素材</h2>
          <MaterialInput onSubmit={handleCreate} isLoading={isSubmitting} />
        </div>
        <div className="px-4 py-2 border-b border-border">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MaterialStatus | "all")}
            className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background text-foreground"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 overflow-auto p-2">
          <MaterialList materials={filteredMaterials} selectedId={selectedMaterial?.id} onSelect={handleSelect} />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {selectedMaterial ? (
          <MaterialDetail material={selectedMaterial} analysis={analysis} onUpdate={handleUpdate} onDelete={handleDelete} onAnalyze={handleAnalyze} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">选择一条素材查看详情</div>
        )}
      </div>
    </div>
  );
}
