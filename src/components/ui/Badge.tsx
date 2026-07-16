import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "office" | "field" | "active" | "inactive" | "default";
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  const variants = {
    office: "bg-blue-50 text-blue-700 border-blue-200",
    field: "bg-amber-50 text-amber-800 border-amber-200",
    active: "bg-green-50 text-status-present border-green-200",
    inactive: "bg-gray-100 text-text-secondary border-border",
    default: "bg-page-bg text-text-primary border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-cell border px-2 py-0.5 text-xs font-medium",
        variants[variant]
      )}
    >
      {children}
    </span>
  );
}
