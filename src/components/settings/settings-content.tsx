"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const AI_MODELS = [
  { value: "deepseek-chat", label: "DeepSeek Chat (V3)", provider: "DeepSeek", description: "快速、性价比高", multimodal: false },
  { value: "deepseek-reasoner", label: "DeepSeek Reasoner (R1)", provider: "DeepSeek", description: "推理能力强，速度较慢", multimodal: false },
  { value: "mimo-v2.5", label: "MiMo V2.5", provider: "小米", description: "通用场景，支持多模态", multimodal: true },
  { value: "mimo-v2.5-pro", label: "MiMo V2.5 Pro", provider: "小米", description: "旗舰模型，多模态，推理能力强", multimodal: true },
];

export function SettingsPage() {
  const [deepseekKey, setDeepseekKey] = useState("");
  const [jinaKey, setJinaKey] = useState("");
  const [mimoKey, setMimoKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("deepseek-chat");
  const [isExporting, setIsExporting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load saved settings
    setDeepseekKey(localStorage.getItem("ordknow_deepseek_key") || "");
    setJinaKey(localStorage.getItem("ordknow_jina_key") || "");
    setMimoKey(localStorage.getItem("ordknow_mimo_key") || "");
    setSelectedModel(localStorage.getItem("ordknow_model") || "deepseek-chat");
  }, []);

  const handleSave = () => {
    localStorage.setItem("ordknow_deepseek_key", deepseekKey);
    localStorage.setItem("ordknow_jina_key", jinaKey);
    localStorage.setItem("ordknow_mimo_key", mimoKey);
    localStorage.setItem("ordknow_model", selectedModel);
    setSaveMessage("配置已保存");
    setTimeout(() => setSaveMessage(null), 2000);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ordknow-export-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export failed:", err);
    }
    setIsExporting(false);
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold">设置</h2>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>API 配置</CardTitle>
          <CardDescription>
            配置 AI 服务的 API Key。留空则使用系统默认配置。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">DeepSeek API Key</label>
            <Input
              type="password"
              placeholder="sk-..."
              value={deepseekKey}
              onChange={(e) => setDeepseekKey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">小米 MiMo API Key</label>
            <Input
              type="password"
              placeholder="sk-..."
              value={mimoKey}
              onChange={(e) => setMimoKey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Jina API Key（Embedding）</label>
            <Input
              type="password"
              placeholder="jina_..."
              value={jinaKey}
              onChange={(e) => setJinaKey(e.target.value)}
            />
          </div>
          <Button onClick={handleSave}>
            保存配置
          </Button>
          {saveMessage && (
            <p className="text-xs text-green-600">{saveMessage}</p>
          )}
        </CardContent>
      </Card>

      {/* Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle>模型选择</CardTitle>
          <CardDescription>
            选择用于知识解析和体系化的 AI 模型。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {AI_MODELS.map((model) => (
              <label
                key={model.value}
                className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                  selectedModel === model.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted"
                }`}
              >
                <input
                  type="radio"
                  name="model"
                  value={model.value}
                  checked={selectedModel === model.value}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{model.label}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {model.provider}
                    </Badge>
                    {model.multimodal && (
                      <Badge variant="success" className="text-[10px]">
                        多模态
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{model.description}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle>数据导出</CardTitle>
          <CardDescription>
            导出你的所有素材和知识体系数据。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            {isExporting ? "导出中..." : "导出 JSON"}
          </Button>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>隐私说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>你的数据存储在 Supabase 云数据库中，受 RLS 保护。</p>
          <p>AI 解析时，你的素材内容会发送到所选 AI 服务进行处理。</p>
          <p>Embedding 向量存储在数据库中，用于相似度搜索。</p>
          <p>我们不会将你的数据用于任何其他用途。</p>
        </CardContent>
      </Card>
    </div>
  );
}
