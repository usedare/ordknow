"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Image, FileText, Mic, Link } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { getAIRequestHeaders } from "@/lib/client-ai-config";

interface MaterialInputProps {
  onSubmit: (title: string, content: string) => Promise<void>;
  isLoading?: boolean;
}

/**
 * 素材输入组件。
 *
 * 它支持四种入口：手写文本、图片 OCR、文件解析、音频转写、网页抓取。
 * 这些入口都只把内容追加到输入框，真正写入数据库发生在用户点击“新增素材”之后。
 * 这样可以让用户在入库前修正识别错误或删除无关内容。
 */
export function MaterialInput({ onSubmit, isLoading }: MaterialInputProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    await onSubmit(title, content);
    setTitle("");
    setContent("");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast("请选择图片文件", "error");
      return;
    }

    setIsProcessing(true);
    toast("正在识别图片内容...", "info");

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // OCR 需要多模态模型；如果用户当前选的是纯文本模型，则自动切到 MiMo。
      const selectedModel = localStorage.getItem("ordknow_model") || "mimo-v2.5";
      const ocrModel = selectedModel.startsWith("mimo") ? selectedModel : "mimo-v2.5";

      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: getAIRequestHeaders(),
        body: JSON.stringify({
          image: base64,
          filename: file.name,
          model: ocrModel,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          setContent((prev) => prev ? prev + "\n\n" + data.text : data.text);
          if (!title && data.suggestedTitle) setTitle(data.suggestedTitle);
          toast("图片识别完成", "success");
        } else {
          toast("未能识别出文字内容", "info");
        }
      } else {
        toast("图片识别失败", "error");
      }
    } catch {
      toast("网络错误", "error");
    }
    setIsProcessing(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "doc", "docx", "txt"].includes(ext || "")) {
      toast("支持 PDF、Word、TXT 文件", "error");
      return;
    }

    // 文件解析只负责把外部资料转成文本草稿，用户点击“新增素材”后才正式入库。
    setIsProcessing(true);
    toast("正在解析文件...", "info");

    try {
      if (ext === "txt") {
        const text = await file.text();
        setContent((prev) => prev ? prev + "\n\n" + text : text);
        if (!title) setTitle(file.name.replace(/\.\w+$/, ""));
        toast("文件解析完成", "success");
      } else {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/parse-file", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.text) {
            setContent((prev) => prev ? prev + "\n\n" + data.text : data.text);
            if (!title && data.suggestedTitle) setTitle(data.suggestedTitle);
            toast("文件解析完成", "success");
          }
        } else {
          toast("文件解析失败", "error");
        }
      }
    } catch {
      toast("文件解析出错", "error");
    }
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["audio/mpeg", "audio/wav", "audio/mp3", "audio/m4a", "audio/ogg", "audio/flac", "audio/webm"];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|ogg|flac|webm)$/i)) {
      toast("请选择音频文件", "error");
      return;
    }

    // 音频同样先转写为文本草稿，保留用户确认和编辑的机会。
    setIsProcessing(true);
    toast("正在转写音频...", "info");

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/audio2text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64, filename: file.name }),
      });

      const data = await res.json();

      if (data.configured === false) {
        toast(data.error || "语音转写未配置", "info");
      } else if (data.text) {
        setContent((prev) => prev ? prev + "\n\n" + data.text : data.text);
        if (!title) setTitle(file.name.replace(/\.\w+$/, ""));
        toast("音频转写完成", "success");
      } else {
        toast(data.error || "转写失败", "error");
      }
    } catch {
      toast("网络错误", "error");
    }
    setIsProcessing(false);
    if (audioInputRef.current) audioInputRef.current.value = "";
  };

  const handleUrlFetch = async () => {
    if (!urlInput.trim()) return;

    // 网页抓取返回的内容会追加到输入框，不直接写库，避免误存噪声页面。
    setIsProcessing(true);
    toast("正在抓取网页内容...", "info");

    try {
      const res = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          setContent((prev) => prev ? prev + "\n\n" + data.text : data.text);
          if (!title && data.suggestedTitle) setTitle(data.suggestedTitle);
          toast("网页内容抓取完成", "success");
          setUrlInput("");
          setShowUrlInput(false);
        }
      } else {
        const data = await res.json();
        toast(data.error || "抓取失败", "error");
      }
    } catch {
      toast("网络错误", "error");
    }
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        placeholder="标题（可选）"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Textarea
        placeholder="输入你的素材内容..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
      />

      {/* 网页抓取输入框：默认折叠，避免主输入区过于复杂。 */}
      {showUrlInput && (
        <div className="flex gap-2">
          <Input
            placeholder="输入网页 URL..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlFetch()}
          />
          <Button type="button" size="sm" onClick={handleUrlFetch} disabled={isProcessing || !urlInput.trim()}>
            抓取
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowUrlInput(false)}>
            取消
          </Button>
        </div>
      )}

      {/* 导入入口：这些按钮只负责“把外部内容变成文本草稿”。 */}
      <div className="flex gap-2 flex-wrap">
        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileUpload} className="hidden" />
        <input ref={audioInputRef} type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.webm" onChange={handleAudioUpload} className="hidden" />

        <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} disabled={isProcessing} className="flex-1">
          <Image className="w-4 h-4 mr-1" />
          图片
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="flex-1">
          <FileText className="w-4 h-4 mr-1" />
          文件
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => audioInputRef.current?.click()} disabled={isProcessing} className="flex-1">
          <Mic className="w-4 h-4 mr-1" />
          音频
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowUrlInput(!showUrlInput)} disabled={isProcessing} className="flex-1">
          <Link className="w-4 h-4 mr-1" />
          网页
        </Button>
      </div>

      <Button type="submit" disabled={isLoading || isProcessing || !content.trim()} className="w-full">
        {isLoading ? "保存中..." : "新增素材"}
      </Button>
    </form>
  );
}
