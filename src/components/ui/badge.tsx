import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none",
  {
    variants: {
      variant: {
        default: "border-slate-200 bg-slate-50 text-slate-700",
        outline: "border-slate-300 bg-white text-slate-600",
        red: "border-red-200 bg-red-50 text-red-700",
        amber: "border-amber-200 bg-amber-50 text-amber-800",
        blue: "border-sky-200 bg-sky-50 text-sky-700",
        green: "border-emerald-200 bg-emerald-50 text-emerald-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
