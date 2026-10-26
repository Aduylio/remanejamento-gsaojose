import { STATUS_SEPARACAO } from "@/lib/status";
import type { StatusSeparacao } from "@/lib/types";
import { cn } from "@/lib/utils";

const estilos: Record<StatusSeparacao, { caixa: string; ponto: string }> = {
  pendente: {
    caixa: "border-amber-200 bg-amber-50 text-amber-800",
    ponto: "bg-amber-500",
  },
  em_separacao: {
    caixa: "border-sky-200 bg-sky-50 text-sky-700",
    ponto: "bg-sky-500",
  },
  separada: {
    caixa: "border-emerald-200 bg-emerald-50 text-emerald-700",
    ponto: "bg-emerald-500",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: StatusSeparacao;
  className?: string;
}) {
  const info = STATUS_SEPARACAO[status];
  const estilo = estilos[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none",
        estilo.caixa,
        className,
      )}
      title={info.descricao}
    >
      <span
        className={cn("size-1.5 rounded-full", estilo.ponto)}
        aria-hidden="true"
      />
      {info.label}
    </span>
  );
}
