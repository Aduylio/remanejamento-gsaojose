import type { StatusFiltro, StatusSeparacao } from "@/lib/types";

interface StatusInfo {
  label: string;
  descricao: string;
}

export const STATUS_SEPARACAO: Record<StatusSeparacao, StatusInfo> = {
  pendente: {
    label: "Pendente",
    descricao: "Aguardando início da separação",
  },
  em_separacao: {
    label: "Em separação",
    descricao: "A separação já foi iniciada",
  },
  separada: {
    label: "Separada",
    descricao: "Separação concluída e conferida",
  },
};

export const FILTROS_STATUS: ReadonlyArray<{
  value: StatusFiltro;
  label: string;
}> = [
  { value: "todos", label: "Todos os status" },
  { value: "pendente", label: "Pendente" },
  { value: "em_separacao", label: "Em separação" },
  { value: "separada", label: "Separada" },
];
