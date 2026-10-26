import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  className?: string;
  indicatorClassName?: string;
  label?: string;
}

export function Progress({
  value,
  className,
  indicatorClassName,
  label = "Progresso da separação",
}: ProgressProps) {
  const percentual = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentual}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-slate-100",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full bg-red-600 transition-[width] duration-300",
          indicatorClassName,
        )}
        style={{ width: `${percentual}%` }}
      />
    </div>
  );
}
