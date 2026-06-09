"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Send, Save, Bot, User, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: number;
  savedToKB?: boolean;
}

export function QAChat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [saveToKB, setSaveToKB] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setIsLoading(true);

    try {
      const model = localStorage.getItem("ordknow_model") || "deepseek-chat";
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, modelId: model, saveToKB }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.answer,
            sources: data.sources,
            savedToKB: data.savedToKB,
          },
        ]);
        if (data.savedToKB) {
          toast("已保存到知识库", "success");
        }
      } else {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error || "回答失败" },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "网络错误，请重试" },
      ]);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
            <Bot className="w-12 h-12" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">知识问答</h3>
              <p className="text-sm mt-1">基于你的知识库回答问题，探索知识关联</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setInput("知识库里有哪些主要主题？")}
                className="p-2 rounded-md border border-border hover:bg-muted text-left"
              >
                知识库里有哪些主要主题？
              </button>
              <button
                onClick={() => setInput("帮我总结一下关于AI的知识")}
                className="p-2 rounded-md border border-border hover:bg-muted text-left"
              >
                帮我总结一下关于AI的知识
              </button>
              <button
                onClick={() => setInput("有哪些知识之间存在关联？")}
                className="p-2 rounded-md border border-border hover:bg-muted text-left"
              >
                有哪些知识之间存在关联？
              </button>
              <button
                onClick={() => setInput("关于深度学习我知道什么？")}
                className="p-2 rounded-md border border-border hover:bg-muted text-left"
              >
                关于深度学习我知道什么？
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <Card className={`max-w-[80%] ${msg.role === "user" ? "bg-primary text-primary-foreground" : ""}`}>
              <CardContent className="p-3">
                <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                {msg.sources !== undefined && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>引用 {msg.sources} 条内容</span>
                    {msg.savedToKB && <Badge>已保存</Badge>}
                  </div>
                )}
              </CardContent>
            </Card>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <Card className="max-w-[80%]">
              <CardContent className="p-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                思考中...
              </CardContent>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="输入你的问题..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              rows={2}
              className="resize-none"
            />
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToKB}
                  onChange={(e) => setSaveToKB(e.target.checked)}
                  className="rounded"
                />
                <Save className="w-3 h-3" />
                保存到知识库
              </label>
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      {children}
    </span>
  );
}
