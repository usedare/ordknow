"use client";

import { useState } from "react";
import { Material, MaterialAnalysis } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MaterialStatusBadge } from "./material-status-badge";

interface MaterialDetailProps {
  material: Material;
  analysis?: MaterialAnalysis | null;
  onUpdate: (id: string, title: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAnalyze: (id: string) => Promise<void>;
}

/**
 * 素材详情组件。
 *
 * 上半部分展示/编辑原始素材；下半部分展示 AI 解析结果。
 * 注意这里不会直接触发体系化，体系化是基于“所有已解析素材”的全库操作。
 */
export function MaterialDetail({
  material,
  analysis,
  onUpdate,
  onDelete,
  onAnalyze,
}: MaterialDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(material.title || "");
  const [content, setContent] = useState(material.raw_content);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleUpdate = async () => {
    // 修改原文后，后端会把素材状态重置为 pending，要求重新 AI 解析。
    setIsUpdating(true);
    await onUpdate(material.id, title, content);
    setIsEditing(false);
    setIsUpdating(false);
  };

  const handleDelete = async () => {
    if (!confirm("确定要删除这条素材吗？")) return;
    setIsDeleting(true);
    await onDelete(material.id);
    setIsDeleting(false);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    await onAnalyze(material.id);
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MaterialStatusBadge status={material.status} />
          <span className="text-xs text-muted-foreground">
            {new Date(material.created_at).toLocaleString("zh-CN")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {material.status === "pending" && (
            <Button size="sm" onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? "解析中..." : "AI 解析"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? "取消" : "编辑"}
          </Button>
          <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            删除
          </Button>
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="space-y-3">
          <Input
            placeholder="标题（可选）"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
          />
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? "保存中..." : "保存"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {material.title && (
            <h3 className="text-lg font-semibold">{material.title}</h3>
          )}
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {material.raw_content}
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {/* 解析结果是 AI 对单条素材的结构化理解，不等同于最终知识体系。 */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI 解析结果</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.core_meaning && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">核心含义</p>
                <p className="text-sm">{analysis.core_meaning}</p>
              </div>
            )}

            {analysis.knowledge_type && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">知识类型</p>
                <Badge variant="outline">{analysis.knowledge_type}</Badge>
              </div>
            )}

            {analysis.topics && analysis.topics.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">主题</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.topics.map((topic, i) => (
                    <Badge key={i} variant="secondary">{topic}</Badge>
                  ))}
                </div>
              </div>
            )}

            {analysis.keywords && analysis.keywords.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">关键词</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.keywords.map((kw, i) => (
                    <Badge key={i} variant="outline">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}

            {analysis.useful_points && analysis.useful_points.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">有效信息</p>
                <ul className="text-sm list-disc list-inside space-y-0.5">
                  {analysis.useful_points.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
