"use client";

import {
  ClipboardList,
  LayoutDashboard,
  PackageCheck,
  Store,
} from "lucide-react";
import type { ReactNode } from "react";

import { AppShell, type NavItem } from "@/components/layout/app-shell";
import { FilialProvider } from "@/components/providers/filial-provider";
import type { Loja } from "@/lib/types";

const navegacao: NavItem[] = [
  {
    href: "/painel",
    label: "Visão geral",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/painel/remanejamentos",
    label: "Remanejamentos",
    icon: ClipboardList,
  },
  {
    href: "/painel/separacao",
    label: "Separação",
    icon: PackageCheck,
  },
];

export function FilialShell({
  loja,
  children,
}: {
  loja: Loja;
  children: ReactNode;
}) {
  return (
    <FilialProvider loja={loja}>
      <AppShell
        mode="filial"
        contextTitle={loja.nome}
        contextSubtitle="Filial selecionada"
        contextIcon={Store}
        navItems={navegacao}
      >
        {children}
      </AppShell>
    </FilialProvider>
  );
}
