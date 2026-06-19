import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground transition-colors placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground transition-colors placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
