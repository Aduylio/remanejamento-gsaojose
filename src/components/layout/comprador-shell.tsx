"use client";

import {
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  ShoppingBag,
} from "lucide-react";
import type { ReactNode } from "react";

import { AppShell, type NavItem } from "@/components/layout/app-shell";

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
  {
    href: "/comprador/importar",
    label: "Importar pedido",
    icon: FileSpreadsheet,
    exact: true,
  },
];

export function CompradorShell({ children }: { children: ReactNode }) {
  return (
    <AppShell
      mode="comprador"
      contextTitle="Comprador"
      contextSubtitle="Visão de toda a rede"
      contextIcon={ShoppingBag}
      navItems={navegacao}
    >
      {children}
    </AppShell>
  );
}
