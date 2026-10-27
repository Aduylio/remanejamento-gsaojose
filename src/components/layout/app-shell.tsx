"use client";

import type { LucideIcon } from "lucide-react";
import { LogOut, Menu, Store } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { sair } from "@/app/login/actions";
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSair = () => {
    startTransition(async () => {
      try {
        await sair();
      } finally {
        router.push("/login");
        router.refresh();
      }
    });
  };

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
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">
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
                    "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
                    ativo
                      ? "bg-white/10 text-white shadow-[inset_2px_0_0_0_var(--color-red-600)]"
                      : "text-white/70 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-[18px] shrink-0",
                      ativo ? "text-white" : "text-white/60",
                    )}
                    aria-hidden="true"
                  />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start text-white/80 hover:bg-white/5 hover:text-white"
          disabled={isPending}
          onClick={handleSair}
        >
          <LogOut className="size-4" aria-hidden="true" />
          {mode === "filial" ? "Sair / trocar filial" : "Sair"}
        </Button>
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
    <div className="flex min-h-dvh bg-[var(--color-bg)]">
      <aside className="sticky top-0 hidden h-dvh w-[var(--sidebar-width)] shrink-0 flex-col bg-gradient-to-b from-[var(--color-navy-900)] to-[var(--color-navy-800)] lg:flex">
        <div className="flex h-[var(--header-height)] items-center border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <Store className="h-4 w-4 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">
                Grupo São José
              </p>
              <p className="text-xs text-white/60">Remanejamento</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              {mode === "filial" ? "Filial selecionada" : "Painel"}
            </p>
            <p className="mt-1 truncate text-sm font-medium text-white">
              {contextTitle}
            </p>
            <p className="truncate text-xs text-white/60">{contextSubtitle}</p>
          </div>
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
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-blue-50)]">
              <Store className="h-4 w-4 text-[var(--color-navy-900)]" />
            </div>
            <span className="text-sm font-semibold text-[var(--color-navy-900)]">
              Grupo São José
            </span>
          </div>
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
        className="bg-gradient-to-b from-[var(--color-navy-900)] to-[var(--color-navy-800)] text-white"
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
