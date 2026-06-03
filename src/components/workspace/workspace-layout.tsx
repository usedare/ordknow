"use client";

import { ReactNode } from "react";

interface WorkspaceLayoutProps {
  leftPanel: ReactNode;
  middlePanel: ReactNode;
  rightPanel: ReactNode;
  toolbar?: ReactNode;
}

export function WorkspaceLayout({
  leftPanel,
  middlePanel,
  rightPanel,
  toolbar,
}: WorkspaceLayoutProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      {toolbar && (
        <div className="h-12 border-b border-border flex items-center px-4 gap-2 shrink-0">
          {toolbar}
        </div>
      )}

      {/* Three-column layout using grid */}
      <div
        className="flex-1 min-h-0"
        style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr 280px",
        }}
      >
        {/* Left panel */}
        <div className="border-r border-border overflow-y-auto overflow-x-hidden">
          {leftPanel}
        </div>

        {/* Middle panel */}
        <div className="overflow-y-auto overflow-x-hidden min-w-0">
          {middlePanel}
        </div>

        {/* Right panel */}
        <div className="border-l border-border overflow-y-auto overflow-x-hidden">
          {rightPanel}
        </div>
      </div>
    </div>
  );
}
