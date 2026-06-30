"use client";

import { useState, useEffect, useRef } from "react";
import { Search, FileText, BookOpen, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  materials: Array<{ id: string; title: string; raw_content: string; status: string }>;
  nodes: Array<{ id: string; title: string; content: string; node_type: string }>;
  topics: Array<{ id: string; title: string; description: string; level: number }>;
}

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMaterialSelect?: (id: string) => void;
  onNodeSelect?: (id: string) => void;
}

export function SearchDialog({ isOpen, onClose, onMaterialSelect, onNodeSelect }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error("Search failed:", err);
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Parent should handle opening
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalResults = (results?.materials.length || 0) + (results?.nodes.length || 0) + (results?.topics.length || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50" onClick={onClose}>
      <div className="bg-background rounded-lg shadow-lg w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索素材、知识节点、主题..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted-foreground bg-muted rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-auto">
          {isSearching && (
            <div className="p-4 text-center text-sm text-muted-foreground">搜索中...</div>
          )}

          {!isSearching && query && totalResults === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">未找到结果</div>
          )}

          {!isSearching && results && (
            <div className="p-2">
              {/* Materials */}
              {results.materials.length > 0 && (
                <div className="mb-3">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">素材</p>
                  {results.materials.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { onMaterialSelect?.(m.id); onClose(); }}
                      className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted flex items-center gap-2 text-sm"
                    >
                      <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{m.title || "无标题"}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Nodes */}
              {results.nodes.length > 0 && (
                <div className="mb-3">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">知识节点</p>
                  {results.nodes.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => { onNodeSelect?.(n.id); onClose(); }}
                      className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted flex items-center gap-2 text-sm"
                    >
                      <BookOpen className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{n.title}</span>
                      {n.node_type && (
                        <Badge variant="secondary" className="text-[10px] ml-auto">{n.node_type}</Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Topics */}
              {results.topics.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">主题</p>
                  {results.topics.map((t) => (
                    <div
                      key={t.id}
                      className="px-2 py-1.5 flex items-center gap-2 text-sm"
                    >
                      <Tag className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{t.title}</span>
                      <Badge variant="outline" className="text-[10px] ml-auto">
                        {t.level === 1 ? "一级" : "二级"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
