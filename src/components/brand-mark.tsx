import { ArrowLeftRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">
        <ArrowLeftRight className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-bold leading-tight tracking-tight text-slate-900">
          Remanejamento
        </span>
        {!compact ? (
          <span className="block text-xs leading-tight text-slate-500">
            Grupo São José
          </span>
        ) : null}
      </span>
    </div>
  );
}
