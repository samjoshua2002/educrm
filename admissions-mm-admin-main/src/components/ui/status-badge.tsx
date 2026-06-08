import { cn } from "@/lib/utils";

export const formStatusStyles: Record<string, string> = {
  Rejected: "bg-[rgba(217,119,6,0.20)] text-[#BD0F0F]",
  "In Progress": "bg-[#FEF3C7] text-[#A34123]",
  Accepted: "bg-[rgba(5,150,105,0.20)] text-[#065F46]",
  Submitted: "bg-[#F3E8FF] text-[#6B21A8]",
  Incomplete: "bg-gray-500/10 text-gray-700",
  "Under Review": "bg-purple-500/10 text-purple-700",
};

interface StatusBadgeProps {
  readonly status: string;
  readonly className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const baseStyle =
    "font-semibold px-2.5 py-0.5 rounded-full text-xs border-0 inline-block text-center whitespace-nowrap";
  const statusStyle =
    formStatusStyles[status] || "bg-gray-500/10 text-gray-700";
  return (
    <span className={cn(baseStyle, statusStyle, className)}>{status}</span>
  );
}
