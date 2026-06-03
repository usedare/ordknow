"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Image, FileText, Mic, Link } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface MaterialInputProps {
  onSubmit: (title: string, content: string) => Promise<void>;
  isLoading?: boolean;
}

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

      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, filename: file.name }),
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

      {/* URL Input */}
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

      {/* Upload buttons */}
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
