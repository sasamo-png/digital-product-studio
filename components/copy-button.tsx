"use client";

import { useState } from "react";
import { Copy, Check, X } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";

type CopyButtonProps = {
  text: string;
  label?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
};

type CopyState = "idle" | "ok" | "error";

// Copia con fallback: navigator.clipboard solo existe en contexto seguro
// (https/localhost). En HTTP (como esta demo) se usa execCommand sobre un
// textarea oculto. Si todo falla, se avisa al usuario en vez de fallar en silencio.
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // cae al fallback
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// Botón reutilizable para copiar texto al portapapeles con feedback visual.
export function CopyButton({
  text,
  label,
  size = "icon",
  variant = "ghost",
}: CopyButtonProps) {
  const [state, setState] = useState<CopyState>("idle");

  async function copy() {
    const ok = await copyText(text);
    setState(ok ? "ok" : "error");
    setTimeout(() => setState("idle"), 1500);
  }

  const text_ =
    state === "ok" ? "Copiado" : state === "error" ? "No se pudo" : label;

  return (
    <Button
      type="button"
      variant={variant}
      size={label ? (size === "icon" ? "sm" : size) : size}
      onClick={copy}
      aria-label="Copiar"
    >
      {state === "ok" ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : state === "error" ? (
        <X className="h-4 w-4 text-destructive" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {label ? <span>{text_}</span> : null}
    </Button>
  );
}
