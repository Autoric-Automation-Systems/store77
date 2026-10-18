"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Campo somente leitura com botão de copiar. O clique seleciona o texto, o que
 * resolve o caso de navegador sem permissão de clipboard.
 */
export function CopyField({
  value,
  label,
  copyLabel = "Copiar link",
}: {
  value: string;
  label: string;
  copyLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        readOnly
        value={value}
        aria-label={label}
        onFocus={(event) => event.currentTarget.select()}
        className="input min-w-0 flex-1 font-mono text-xs"
      />
      <button type="button" onClick={copy} className="btn btn-secondary">
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copiado" : copyLabel}
      </button>
    </div>
  );
}
