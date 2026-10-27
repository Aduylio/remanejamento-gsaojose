"use client";

import {
  ClipboardList,
  LayoutDashboard,
  ShoppingBag,
} from "lucide-react";
import type { ReactNode } from "react";

import { AppShell, type NavItem } from "@/components/layout/app-shell";
import { FiliaisProvider } from "@/components/providers/filiais-provider";
import { RemanejamentosProvider } from "@/components/providers/remanejamentos-provider";
import type { Loja, Remanejamento } from "@/lib/types";

const navegacao: NavItem[] = [
  {
    href: "/comprador",
    label: "Visão geral",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/comprador/remanejamentos",
    label: "Remanejamentos",
    icon: ClipboardList,
  },
];

export function CompradorShell({
  filiais,
  remanejamentosIniciais,
  children,
}: {
  filiais: readonly Loja[];
  remanejamentosIniciais: Remanejamento[];
  children: ReactNode;
}) {
  return (
    <FiliaisProvider filiais={filiais}>
      <RemanejamentosProvider remanejamentosIniciais={remanejamentosIniciais}>
        <AppShell
          mode="comprador"
          contextTitle="Grupo São José"
          contextSubtitle="Painel do comprador"
          contextIcon={ShoppingBag}
          navItems={navegacao}
        >
          {children}
        </AppShell>
      </RemanejamentosProvider>
    </FiliaisProvider>
  );
}
