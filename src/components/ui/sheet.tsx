"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  className,
}: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      onClose={() => onOpenChange(false)}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
      className={cn(
        "m-0 mr-auto h-dvh max-h-dvh w-[86vw] max-w-xs overflow-hidden rounded-none border-0 bg-white p-0 text-left text-slate-900 shadow-xl backdrop:bg-slate-900/40",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <span className="text-sm font-semibold text-slate-900">{title}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Fechar menu"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="h-[calc(100dvh-4.5rem)] overflow-y-auto">
        {children}
      </div>
    </dialog>
  );
}
