"use client";

import type { LucideIcon } from "lucide-react";
import { LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { sair } from "@/app/login/actions";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

interface AppShellProps {
  mode: "filial" | "comprador";
  contextTitle: string;
  contextSubtitle: string;
  contextIcon: LucideIcon;
  navItems: NavItem[];
  children: ReactNode;
}

function itemEstaAtivo(pathname: string, item: NavItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function Navegacao({
  navItems,
  mode,
  contextTitle,
  contextSubtitle,
  contextIcon: ContextIcon,
  onNavigate,
}: {
  navItems: NavItem[];
  mode: "filial" | "comprador";
  contextTitle: string;
  contextSubtitle: string;
  contextIcon: LucideIcon;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-4">
        <div className="flex items-center gap-2.5">
          <ContextIcon
            className="size-4 shrink-0 text-slate-400"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {contextTitle}
            </p>
            <p className="truncate text-xs text-slate-500">{contextSubtitle}</p>
          </div>
        </div>
      </div>

      <nav aria-label="Navegação principal" className="flex-1 px-3 py-4">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Menu
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const ativo = itemEstaAtivo(pathname, item);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={ativo ? "page" : undefined}
                  className={cn(
                    "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    ativo
                      ? "bg-red-50 text-red-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      ativo ? "text-red-700" : "text-slate-400",
                    )}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-200 p-3">
        <form action={sair}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start"
          >
            <LogOut className="size-4" aria-hidden="true" />
            {mode === "filial" ? "Sair / trocar filial" : "Sair"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function AppShell({
  mode,
  contextTitle,
  contextSubtitle,
  contextIcon,
  navItems,
  children,
}: AppShellProps) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="flex min-h-dvh bg-slate-50">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-slate-200 px-5">
          <BrandMark />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Navegacao
            navItems={navItems}
            mode={mode}
            contextTitle={contextTitle}
            contextSubtitle={contextSubtitle}
            contextIcon={contextIcon}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Abrir menu de navegação"
            onClick={() => setMenuAberto(true)}
          >
            <Menu className="size-5" />
          </Button>
          <BrandMark compact />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {mode === "filial" ? "Filial" : "Comprador"}
          </span>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 py-4 text-center text-xs text-slate-400 sm:px-6 lg:px-8 lg:text-left">
          Remanejamento de mercadorias · Grupo São José
        </footer>
      </div>

      <Sheet
        open={menuAberto}
        onOpenChange={setMenuAberto}
        title="Menu"
      >
        <Navegacao
          navItems={navItems}
          mode={mode}
          contextTitle={contextTitle}
          contextSubtitle={contextSubtitle}
          contextIcon={contextIcon}
          onNavigate={() => setMenuAberto(false)}
        />
      </Sheet>
    </div>
  );
}
