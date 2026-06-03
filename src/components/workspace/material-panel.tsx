"use client";

import { Material } from "@/types";
import { MaterialList } from "@/components/materials/material-list";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface MaterialPanelProps {
  materials: Material[];
  selectedId?: string;
  onSelect: (material: Material) => void;
}

export function MaterialPanel({ materials, selectedId, onSelect }: MaterialPanelProps) {
  const [search, setSearch] = useState("");

  const filteredMaterials = materials.filter(
    (m) =>
      m.raw_content.toLowerCase().includes(search.toLowerCase()) ||
      (m.title && m.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <Input
          placeholder="搜索素材..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-auto p-2">
        <MaterialList
          materials={filteredMaterials}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}
