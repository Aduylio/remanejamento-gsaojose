import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Select({
  className,
  children,
  ...props
}: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white py-0 pl-3 pr-9 text-sm text-slate-900 outline-none transition-colors focus:border-red-600 focus:ring-2 focus:ring-red-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
}
