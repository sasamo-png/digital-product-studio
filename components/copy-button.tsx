"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";

type CopyButtonProps = {
  text: string;
  label?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
};

// Botón reutilizable para copiar texto al portapapeles con feedback visual.
export function CopyButton({
  text,
  label,
  size = "icon",
  variant = "ghost",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // navigator.clipboard requiere contexto seguro (https/localhost).
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={label ? size === "icon" ? "sm" : size : size}
      onClick={copy}
      aria-label="Copiar"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {label ? <span>{copied ? "Copiado" : label}</span> : null}
    </Button>
  );
}
