"use client";

import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

interface SubmitButtonProps extends ComponentProps<typeof Button> {
  pendingLabel?: string;
}

export function SubmitButton({
  children,
  pendingLabel = "Aguarde...",
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      {...props}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : null}
      {pending ? pendingLabel : children}
    </Button>
  );
}
