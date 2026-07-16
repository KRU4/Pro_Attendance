import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ className, label, error, id, ...props }: InputProps) {
  const inputId = id || label?.replace(/\s/g, "-").toLowerCase();
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
          {label}
          {props.required && <span className="text-status-absent ms-1">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full rounded-cell border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1",
          error && "border-status-absent",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-status-absent">{error}</p>}
    </div>
  );
}
