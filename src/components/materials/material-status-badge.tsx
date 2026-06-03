import { MaterialStatus } from "@/types";
import { Badge } from "@/components/ui/badge";

const statusConfig: Record<MaterialStatus, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }> = {
  pending: { label: "待解析", variant: "secondary" },
  analyzing: { label: "解析中", variant: "warning" },
  analyzed: { label: "已解析", variant: "success" },
  failed: { label: "解析失败", variant: "destructive" },
};

export function MaterialStatusBadge({ status }: { status: MaterialStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
