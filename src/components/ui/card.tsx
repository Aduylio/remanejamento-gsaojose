import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-1 px-5 pt-5 sm:px-6", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "text-base font-semibold tracking-tight text-slate-900",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      className={cn("text-sm leading-relaxed text-slate-500", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border-t border-slate-100 px-5 py-4 sm:px-6",
        className,
      )}
      {...props}
    />
  );
}
