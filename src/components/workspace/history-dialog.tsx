"use client";

import { useState, useEffect } from "react";
import { KnowledgeVersion } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface HistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVersion?: (version: KnowledgeVersion) => void;
}

interface VersionDiff {
  version_number: number;
  created_at: string;
  summary: string;
  historical: {
    topic_count: number;
    branch_count: number;
    node_count: number;
    topics: Array<{
      title: string;
      branches: Array<{ title: string; node_count: number }>;
    }>;
  };
  current: {
    topic_count: number;
    branch_count: number;
    node_count: number;
  };
  changes: {
    topics_added: number;
    nodes_added: number;
  };
}

export function HistoryDialog({ isOpen, onClose, onSelectVersion }: HistoryDialogProps) {
  const [versions, setVersions] = useState<KnowledgeVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDiff, setSelectedDiff] = useState<VersionDiff | null>(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchVersions();
      setSelectedDiff(null);
    }
  }, [isOpen]);

  const fetchVersions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/knowledge/versions");
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch (err) {
      console.error("Failed to fetch versions:", err);
    }
    setIsLoading(false);
  };

  const handleCompare = async (versionId: string) => {
    setIsLoadingDiff(true);
    try {
      const res = await fetch(`/api/knowledge/versions/${versionId}/diff`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDiff(data);
      }
    } catch (err) {
      console.error("Failed to fetch diff:", err);
    }
    setIsLoadingDiff(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold">重构历史</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>关闭</Button>
        </div>

        <div className="p-4 overflow-auto max-h-[70vh]">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">加载中...</p>
          ) : versions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">暂无历史版本</p>
          ) : selectedDiff ? (
            // Version comparison view
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setSelectedDiff(null)}>
                ← 返回列表
              </Button>
              <h3 className="font-medium">版本 {selectedDiff.version_number} 对比</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-2xl font-bold">{selectedDiff.historical.topic_count}</p>
                    <p className="text-xs text-muted-foreground">历史主题数</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-2xl font-bold">{selectedDiff.current.topic_count}</p>
                    <p className="text-xs text-muted-foreground">当前主题数</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-2xl font-bold text-green-600">
                      {selectedDiff.changes.topics_added >= 0 ? "+" : ""}{selectedDiff.changes.topics_added}
                    </p>
                    <p className="text-xs text-muted-foreground">主题变化</p>
                  </CardContent>
                </Card>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-2xl font-bold">{selectedDiff.historical.node_count}</p>
                    <p className="text-xs text-muted-foreground">历史节点数</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-2xl font-bold">{selectedDiff.current.node_count}</p>
                    <p className="text-xs text-muted-foreground">当前节点数</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-2xl font-bold text-green-600">
                      {selectedDiff.changes.nodes_added >= 0 ? "+" : ""}{selectedDiff.changes.nodes_added}
                    </p>
                    <p className="text-xs text-muted-foreground">节点变化</p>
                  </CardContent>
                </Card>
              </div>
              {selectedDiff.summary && (
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">{selectedDiff.summary}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            // Version list
            <div className="space-y-3">
              {versions.map((version) => (
                <Card key={version.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">版本 {version.version_number}</CardTitle>
                      <Badge variant="outline">
                        {new Date(version.created_at).toLocaleDateString("zh-CN")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {version.summary && (
                      <p className="text-xs text-muted-foreground mb-2">{version.summary}</p>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleCompare(version.id)} disabled={isLoadingDiff}>
                        对比
                      </Button>
                      {onSelectVersion && (
                        <Button size="sm" variant="outline" onClick={() => onSelectVersion(version)}>
                          查看
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
