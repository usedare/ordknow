"use client";

import { Material } from "@/types";
import { MaterialStatusBadge } from "./material-status-badge";
import { cn } from "@/lib/utils";

interface MaterialListProps {
  materials: Material[];
  selectedId?: string;
  onSelect: (material: Material) => void;
}

export function MaterialList({ materials, selectedId, onSelect }: MaterialListProps) {
  if (materials.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 text-sm">
        暂无素材，开始添加吧
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {materials.map((material) => (
        <button
          key={material.id}
          onClick={() => onSelect(material)}
          className={cn(
            "w-full text-left p-3 rounded-md hover:bg-muted transition-colors",
            selectedId === material.id && "bg-muted"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">
                {material.title || "无标题"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {material.raw_content.slice(0, 100)}
              </p>
            </div>
            <MaterialStatusBadge status={material.status} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(material.created_at).toLocaleDateString("zh-CN")}
          </p>
        </button>
      ))}
    </div>
  );
}
