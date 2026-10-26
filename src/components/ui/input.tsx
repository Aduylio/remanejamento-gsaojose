import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-red-600 focus:ring-2 focus:ring-red-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-red-600 focus:ring-2 focus:ring-red-600/15 disabled:cursor-not-allowed disabled:bg-slate-50",
        className,
      )}
      {...props}
    />
  );
}
