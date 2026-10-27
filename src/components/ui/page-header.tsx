import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  align?: "left" | "center";
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  align = "left",
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-col gap-3 sm:items-center sm:justify-between",
        align === "center" ? "sm:flex-col" : "sm:flex-row",
      )}
    >
      <div
        className={cn(
          "min-w-0",
          align === "center" ? "text-center" : "",
        )}
      >
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-red-600">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div
          className={cn(
            "flex shrink-0 flex-wrap items-center gap-2",
            align === "center" ? "sm:justify-center" : "",
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}
