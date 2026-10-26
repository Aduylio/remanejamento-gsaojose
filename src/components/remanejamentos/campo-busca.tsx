"use client";

import { Search } from "lucide-react";
import { useId } from "react";

import { Input } from "@/components/ui/input";

export function CampoBusca({
  value,
  onChange,
  placeholder = "Buscar por número, produto ou EAN",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = useId();

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-9"
      />
    </div>
  );
}
