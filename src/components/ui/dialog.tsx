"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
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
        "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white p-0 text-left text-slate-900 shadow-xl backdrop:bg-slate-900/40",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Fechar"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto px-5 py-4 sm:px-6">
        {children}
      </div>

      {footer ? (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}
