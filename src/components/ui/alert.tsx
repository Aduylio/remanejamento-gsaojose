import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type AlertVariant = "default" | "info" | "warning" | "success" | "danger";

const alertStyles: Record<AlertVariant, string> = {
  default: "border-slate-200 bg-white text-slate-700",
  info: "border-slate-200 bg-slate-50 text-slate-700",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  danger: "border-red-200 bg-red-50 text-red-900",
};

interface AlertProps extends ComponentProps<"div"> {
  variant?: AlertVariant;
}

export function Alert({
  className,
  variant = "default",
  ...props
}: AlertProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex gap-3 rounded-lg border px-4 py-3 text-sm leading-relaxed",
        alertStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
