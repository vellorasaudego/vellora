"use client";

import { useEffect, useRef, useState } from "react";

type Turnstile = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    }
  ) => string;
  remove?: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-vellora-turnstile="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Turnstile indisponível.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.velloraTurnstile = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Turnstile indisponível.")), { once: true });
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function TurnstileWidget({
  siteKey,
  required = false,
  onToken,
}: {
  siteKey: string;
  required?: boolean;
  onToken: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  const [status, setStatus] = useState<"loading" | "ready" | "verified" | "expired" | "error">("loading");

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let widgetId: string | undefined;
    let cancelled = false;

    setStatus("loading");

    loadTurnstile()
      .then(() => {
        if (cancelled) return;
        if (!containerRef.current || !window.turnstile) {
          setStatus("error");
          onTokenRef.current("");
          return;
        }
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => {
            setStatus("verified");
            onTokenRef.current(token);
          },
          "expired-callback": () => {
            setStatus("expired");
            onTokenRef.current("");
          },
          "error-callback": () => {
            setStatus("error");
            onTokenRef.current("");
          },
        });
        setStatus("ready");
      })
      .catch(() => {
        setStatus("error");
        onTokenRef.current("");
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile?.remove) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  if (!siteKey) {
    if (!required) return null;
    return (
      <div
        className="sm:col-span-2 rounded-lg border border-[var(--status-critical)]/40 bg-[var(--surface-soft)] p-3"
        role="alert"
        aria-live="polite"
      >
        <p className="text-sm font-semibold text-[var(--status-critical)]">Proteção de segurança indisponível</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
          O envio está temporariamente bloqueado porque a verificação de segurança ainda não foi configurada.
        </p>
      </div>
    );
  }
  return (
    <div className="sm:col-span-2 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3">
      <p className="mb-2 text-xs text-[var(--muted)]">Confirmação de segurança</p>
      <div ref={containerRef} aria-label="Desafio de segurança" />
      <p className="mt-2 text-xs text-[var(--muted)]" role="status" aria-live="polite">
        {status === "loading" ? "Carregando a proteção de segurança..." : null}
        {status === "ready" ? "Conclua a verificação para liberar o envio." : null}
        {status === "verified" ? "Verificação concluída." : null}
        {status === "expired" ? "A verificação expirou. Conclua-a novamente para enviar." : null}
        {status === "error" ? "Não foi possível carregar a verificação. Atualize a página e tente novamente." : null}
      </p>
    </div>
  );
}
