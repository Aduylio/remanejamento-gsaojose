"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { criarCatalogoFiliais, type CatalogoFiliais } from "@/lib/filiais";
import type { Loja } from "@/lib/types";

const FiliaisContext = createContext<CatalogoFiliais | null>(null);

export function FiliaisProvider({
  filiais,
  children,
}: {
  filiais: readonly Loja[];
  children: ReactNode;
}) {
  const catalogo = useMemo(() => criarCatalogoFiliais(filiais), [filiais]);

  return (
    <FiliaisContext.Provider value={catalogo}>
      {children}
    </FiliaisContext.Provider>
  );
}

export function useFiliais(): CatalogoFiliais {
  const catalogo = useContext(FiliaisContext);

  if (!catalogo) {
    throw new Error("useFiliais deve ser usado dentro de FiliaisProvider.");
  }

  return catalogo;
}
