"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Loja } from "@/lib/types";

const FilialContext = createContext<Loja | null>(null);

export function FilialProvider({
  loja,
  children,
}: {
  loja: Loja;
  children: ReactNode;
}) {
  return <FilialContext.Provider value={loja}>{children}</FilialContext.Provider>;
}

export function useFilial(): Loja {
  const loja = useContext(FilialContext);

  if (!loja) {
    throw new Error("useFilial deve ser usado dentro de FilialProvider.");
  }

  return loja;
}
