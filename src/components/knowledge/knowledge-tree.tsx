"use client";

import { useState } from "react";
import { KnowledgeTopic, KnowledgeNode } from "@/types";
import { ChevronRight, ChevronDown, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface KnowledgeTreeProps {
  topics: Array<KnowledgeTopic & { children?: Array<KnowledgeTopic & { nodes?: KnowledgeNode[] }> }>;
  onNodeSelect?: (node: KnowledgeNode) => void;
  selectedNodeId?: string;
}

export function KnowledgeTree({ topics, onNodeSelect, selectedNodeId }: KnowledgeTreeProps) {
  if (!topics || topics.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 text-sm">
        暂无知识体系，请先点击"一键体系化"
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {topics.map((topic) => (
        <TopicNode
          key={topic.id}
          topic={topic}
          onNodeSelect={onNodeSelect}
          selectedNodeId={selectedNodeId}
        />
      ))}
    </div>
  );
}

function TopicNode({
  topic,
  onNodeSelect,
  selectedNodeId,
}: {
  topic: KnowledgeTopic & { children?: Array<KnowledgeTopic & { nodes?: KnowledgeNode[] }> };
  onNodeSelect?: (node: KnowledgeNode) => void;
  selectedNodeId?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium hover:bg-muted rounded-md transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 shrink-0" />
        )}
        <span className="truncate">{topic.title}</span>
        {topic.children && topic.children.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {topic.children.length}
          </span>
        )}
      </button>

      {isExpanded && topic.children && (
        <div className="ml-4">
          {topic.children.map((child) => (
            <ChildNode
              key={child.id}
              child={child}
              onNodeSelect={onNodeSelect}
              selectedNodeId={selectedNodeId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChildNode({
  child,
  onNodeSelect,
  selectedNodeId,
}: {
  child: KnowledgeTopic & { nodes?: KnowledgeNode[] };
  onNodeSelect?: (node: KnowledgeNode) => void;
  selectedNodeId?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-muted rounded-md transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        )}
        <span className="truncate text-muted-foreground">{child.title}</span>
        {child.nodes && child.nodes.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {child.nodes.length}
          </span>
        )}
      </button>

      {isExpanded && child.nodes && (
        <div className="ml-4">
          {child.nodes.map((node) => (
            <button
              key={node.id}
              onClick={() => onNodeSelect?.(node)}
              className={cn(
                "w-full flex items-center gap-1.5 px-2 py-1 text-sm rounded-md transition-colors",
                selectedNodeId === node.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted text-foreground"
              )}
            >
              <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{node.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
