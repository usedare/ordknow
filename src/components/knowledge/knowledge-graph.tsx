"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { KnowledgeNode, KnowledgeEdge } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GraphNode {
  id: string;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  node_type?: string;
}

interface GraphEdge {
  source: string;
  target: string;
  edge_type: string;
}

interface KnowledgeGraphProps {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  onNodeClick?: (node: KnowledgeNode) => void;
}

// 不同关系类型使用固定颜色，保持图谱在多次渲染时语义稳定。
const edgeColors: Record<string, string> = {
  related: "#6b7280",
  prerequisite: "#3b82f6",
  supports: "#10b981",
  contradicts: "#ef4444",
  extends: "#8b5cf6",
  example_of: "#f59e0b",
  part_of: "#6366f1",
  duplicate: "#ec4899",
};

export function KnowledgeGraph({ nodes, edges, onNodeClick }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const animationRef = useRef<number>(0);

  // 初始位置使用随机散布，随后由轻量力导向模拟自动拉开节点。
  useEffect(() => {
    if (nodes.length === 0) return;

    const newNodes: GraphNode[] = nodes.map((node, i) => ({
      id: node.id,
      title: node.title,
      x: dimensions.width / 2 + (Math.random() - 0.5) * 300,
      y: dimensions.height / 2 + (Math.random() - 0.5) * 300,
      vx: 0,
      vy: 0,
      node_type: node.node_type || undefined,
    }));

    const newEdges: GraphEdge[] = edges.map((e) => ({
      source: e.source_node_id,
      target: e.target_node_id,
      edge_type: e.edge_type,
    }));

    setGraphNodes(newNodes);
    setGraphEdges(newEdges);
  }, [nodes, edges, dimensions.width, dimensions.height]);

  // 简化版力导向布局：节点互斥、关系边牵引、整体向中心收束。
  useEffect(() => {
    if (graphNodes.length === 0) return;

    let running = true;
    const tick = () => {
      if (!running) return;

      setGraphNodes((prev) => {
        const next = prev.map((n) => ({ ...n }));

        // 节点之间的斥力，避免文字和圆点全部挤在一起。
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const dx = next[j].x - next[i].x;
            const dy = next[j].y - next[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 500 / (dist * dist);
            next[i].vx -= (dx / dist) * force;
            next[i].vy -= (dy / dist) * force;
            next[j].vx += (dx / dist) * force;
            next[j].vy += (dy / dist) * force;
          }
        }

        // 有关系边的节点互相吸引，体现知识关联。
        for (const edge of newEdges) {
          const source = next.find((n) => n.id === edge.source);
          const target = next.find((n) => n.id === edge.target);
          if (!source || !target) continue;

          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 100) * 0.01;
          source.vx += (dx / dist) * force;
          source.vy += (dy / dist) * force;
          target.vx -= (dx / dist) * force;
          target.vy -= (dy / dist) * force;
        }

        // 中心引力和阻尼，防止图谱不断漂移。
        for (const n of next) {
          n.vx += (dimensions.width / 2 - n.x) * 0.001;
          n.vy += (dimensions.height / 2 - n.y) * 0.001;
          n.vx *= 0.9; // damping
          n.vy *= 0.9;
          n.x += n.vx;
          n.y += n.vy;
          n.x = Math.max(30, Math.min(dimensions.width - 30, n.x));
          n.y = Math.max(30, Math.min(dimensions.height - 30, n.y));
        }

        return next;
      });

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [graphNodes.length, graphEdges, dimensions]);

  const newEdges = graphEdges;

  if (nodes.length === 0) {
    return (
      <Card className={cn("h-full", isFullscreen && "fixed inset-0 z-50")}>
        <CardContent className="flex items-center justify-center h-full text-muted-foreground text-sm">
          暂无知识节点
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col", isFullscreen && "fixed inset-0 z-50")}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">知识图谱</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)}>
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="bg-background"
        >
          {/* Edges */}
          {graphEdges.map((edge, i) => {
            const source = graphNodes.find((n) => n.id === edge.source);
            const target = graphNodes.find((n) => n.id === edge.target);
            if (!source || !target) return null;
            return (
              <line
                key={i}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={edgeColors[edge.edge_type] || "#6b7280"}
                strokeWidth={1.5}
                strokeOpacity={0.6}
              />
            );
          })}

          {/* Nodes */}
          {graphNodes.map((node) => (
            <g
              key={node.id}
              className="cursor-pointer"
              onClick={() => {
                const original = nodes.find((n) => n.id === node.id);
                if (original) onNodeClick?.(original);
              }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={16}
                fill="var(--primary)"
                opacity={0.9}
              />
              <text
                x={node.x}
                y={node.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--primary-foreground)"
                fontSize={8}
                fontWeight="bold"
              >
                {node.title.slice(0, 2)}
              </text>
              <text
                x={node.x}
                y={node.y + 28}
                textAnchor="middle"
                fill="var(--muted-foreground)"
                fontSize={9}
              >
                {node.title.length > 10 ? node.title.slice(0, 10) + "..." : node.title}
              </text>
            </g>
          ))}
        </svg>
      </CardContent>
    </Card>
  );
}
