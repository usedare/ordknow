"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ViewToggleProps {
  activeView: "raw" | "systematized";
  onChange: (view: "raw" | "systematized") => void;
}

export function ViewToggle({ activeView, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
      <button
        onClick={() => onChange("raw")}
        className={cn(
          "px-3 py-1 text-sm rounded-md transition-colors",
          activeView === "raw"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        原始视图
      </button>
      <button
        onClick={() => onChange("systematized")}
        className={cn(
          "px-3 py-1 text-sm rounded-md transition-colors",
          activeView === "systematized"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        体系视图
      </button>
    </div>
  );
}
