import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary: "bg-brand text-white hover:bg-brand/90 focus-visible:ring-brand",
    secondary:
      "bg-white text-text-primary border border-border hover:bg-page-bg focus-visible:ring-brand",
    ghost: "text-text-primary hover:bg-page-bg focus-visible:ring-brand",
    danger: "bg-status-absent text-white hover:bg-status-absent/90 focus-visible:ring-status-absent",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-cell font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
