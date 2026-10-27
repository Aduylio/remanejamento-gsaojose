import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[9px] text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-red-600)]/25 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-red-600)] text-white hover:bg-[var(--color-red-700)] active:bg-[var(--color-red-700)]",
        secondary:
          "border border-[var(--color-border-strong)] bg-white text-[var(--color-navy-900)] hover:bg-[var(--color-blue-50)]",
        ghost:
          "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-text-primary)]",
        outline:
          "border border-[var(--color-border-strong)] bg-white text-[var(--color-navy-900)] hover:bg-[var(--color-blue-50)]",
        link: "h-auto p-0 text-[var(--color-navy-800)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 px-3 text-sm",
        lg: "h-12 px-6 text-sm",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
