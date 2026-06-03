"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface MaterialInputProps {
  onSubmit: (title: string, content: string) => Promise<void>;
  isLoading?: boolean;
}

export function MaterialInput({ onSubmit, isLoading }: MaterialInputProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    await onSubmit(title, content);
    setTitle("");
    setContent("");
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
      <Button type="submit" disabled={isLoading || !content.trim()} className="w-full">
        {isLoading ? "保存中..." : "新增素材"}
      </Button>
    </form>
  );
}
