"use client";

import { KnowledgeTopic, KnowledgeNode } from "@/types";
import { KnowledgeTree } from "@/components/knowledge/knowledge-tree";

interface KnowledgePanelProps {
  topics: Array<KnowledgeTopic & { children?: Array<KnowledgeTopic & { nodes?: KnowledgeNode[] }> }>;
  onNodeSelect?: (node: KnowledgeNode) => void;
  selectedNodeId?: string;
}

export function KnowledgePanel({ topics, onNodeSelect, selectedNodeId }: KnowledgePanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h3 className="font-semibold text-sm">知识体系</h3>
      </div>
      <div className="flex-1 overflow-auto p-2">
        <KnowledgeTree
          topics={topics}
          onNodeSelect={onNodeSelect}
          selectedNodeId={selectedNodeId}
        />
      </div>
    </div>
  );
}
