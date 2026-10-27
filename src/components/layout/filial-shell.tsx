"use client";

import {
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  PackageCheck,
  Store,
} from "lucide-react";
import type { ReactNode } from "react";

import { AppShell, type NavItem } from "@/components/layout/app-shell";
import { FilialProvider } from "@/components/providers/filial-provider";
import { FiliaisProvider } from "@/components/providers/filiais-provider";
import { RemanejamentosProvider } from "@/components/providers/remanejamentos-provider";
import type { Loja, Remanejamento } from "@/lib/types";

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
  {
    href: "/conta/trocar-senha",
    label: "Alterar senha",
    icon: KeyRound,
  },
];

export function FilialShell({
  loja,
  filiais,
  remanejamentosIniciais,
  children,
}: {
  loja: Loja;
  filiais: readonly Loja[];
  remanejamentosIniciais: Remanejamento[];
  children: ReactNode;
}) {
  return (
    <FiliaisProvider filiais={filiais}>
      <RemanejamentosProvider remanejamentosIniciais={remanejamentosIniciais}>
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
      </RemanejamentosProvider>
    </FiliaisProvider>
  );
}
