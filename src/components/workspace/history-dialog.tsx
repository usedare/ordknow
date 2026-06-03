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

export function HistoryDialog({ isOpen, onClose, onSelectVersion }: HistoryDialogProps) {
  const [versions, setVersions] = useState<KnowledgeVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchVersions();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold">重构历史</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            关闭
          </Button>
        </div>

        <div className="p-4 overflow-auto max-h-[60vh]">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">加载中...</p>
          ) : versions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              暂无历史版本
            </p>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <Card key={version.id} className="cursor-pointer hover:bg-muted transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        版本 {version.version_number}
                      </CardTitle>
                      <Badge variant="outline">
                        {new Date(version.created_at).toLocaleDateString("zh-CN")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {version.summary && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {version.summary}
                      </p>
                    )}
                    {onSelectVersion && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => onSelectVersion(version)}
                      >
                        查看此版本
                      </Button>
                    )}
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
