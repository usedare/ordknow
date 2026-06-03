"use client";

import { Material, MaterialAnalysis } from "@/types";
import { MaterialDetail } from "@/components/materials/material-detail";
import { MaterialInput } from "@/components/materials/material-input";

interface DetailPanelProps {
  material?: Material | null;
  analysis?: MaterialAnalysis | null;
  onCreate: (title: string, content: string) => Promise<void>;
  onUpdate: (id: string, title: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAnalyze: (id: string) => Promise<void>;
  isCreating?: boolean;
}

export function DetailPanel({
  material,
  analysis,
  onCreate,
  onUpdate,
  onDelete,
  onAnalyze,
  isCreating,
}: DetailPanelProps) {
  if (material) {
    return (
      <div className="p-6 overflow-auto">
        <MaterialDetail
          material={material}
          analysis={analysis}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onAnalyze={onAnalyze}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="font-semibold mb-4">新增素材</h3>
      <MaterialInput onSubmit={onCreate} isLoading={isCreating} />
    </div>
  );
}
