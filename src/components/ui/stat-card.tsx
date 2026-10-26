import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatTone = "default" | "red" | "amber" | "blue" | "green";

const estilos: Record<StatTone, { icone: string; valor: string }> = {
  default: { icone: "text-slate-400", valor: "text-slate-900" },
  red: { icone: "text-red-500", valor: "text-slate-900" },
  amber: { icone: "text-amber-500", valor: "text-slate-900" },
  blue: { icone: "text-sky-500", valor: "text-slate-900" },
  green: { icone: "text-emerald-500", valor: "text-slate-900" },
};

interface StatCardProps {
  label: string;
  value: number;
  description: string;
  icon: LucideIcon;
  tone?: StatTone;
  className?: string;
}

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
  className,
}: StatCardProps) {
  const estilo = estilos[tone];

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center gap-2">
        <Icon
          className={cn("size-3.5 shrink-0", estilo.icone)}
          aria-hidden="true"
        />
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tracking-tight",
          estilo.valor,
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        {description}
      </p>
    </Card>
  );
}
