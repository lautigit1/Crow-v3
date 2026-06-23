import { Badge } from "@/shared/ui";
import type { QuoteStatus } from ".";

const tone: Record<QuoteStatus, "primary" | "warning" | "success" | "neutral"> = {
  Nueva: "primary",
  "En revisión": "warning",
  Respondida: "success",
  Finalizada: "neutral",
};

export function StatusBadge({ status }: { status: QuoteStatus }) {
  return <Badge tone={tone[status]}>{status}</Badge>;
}
