"use client";

import { FormEvent, useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Não foi possível enviar as instruções.");
      } else {
        setMessage(data.message);
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="recovery-email" className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]">
          E-mail de acesso
        </label>
        <input
          id="recovery-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="form-control"
          placeholder="voce@email.com"
        />
      </div>
      {message && (
        <p className="rounded-xl bg-[var(--brand-light)] p-4 text-sm leading-6 text-[var(--brand-deep)]" role="status">
          {message}
        </p>
      )}
      {error && <p className="text-sm text-[var(--status-critical)]" role="alert">{error}</p>}
      <button
        type="submit"
        disabled={loading || !!message}
        className="w-full rounded-full bg-[var(--brand-dark)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--brand-deep)] disabled:opacity-50"
      >
        {loading ? "Enviando..." : "Enviar instruções"}
      </button>
    </form>
  );
}
