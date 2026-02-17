import { cn } from "@/lib/utils";
import { STATUS_COLORS, type ContactStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: ContactStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        STATUS_COLORS[status],
        className
      )}
    >
      {status}
    </span>
  );
}
