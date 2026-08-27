"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { TurnstileWidget } from "./TurnstileWidget";

const PROFESSIONS = [
  { value: "cuidador", label: "Cuidador(a)" },
  { value: "tecnico_enfermagem", label: "Técnico(a) de enfermagem" },
  { value: "enfermeiro", label: "Enfermeiro(a)" },
  { value: "outros", label: "Outros" },
] as const;

const DAYS = [
  { value: "segunda", label: "Segunda" },
  { value: "terca", label: "Terça" },
  { value: "quarta", label: "Quarta" },
  { value: "quinta", label: "Quinta" },
  { value: "sexta", label: "Sexta" },
  { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
] as const;

const SHIFTS = [
  { value: "manha", label: "Manhã · 6h às 12h" },
  { value: "tarde", label: "Tarde · 12h às 18h" },
  { value: "noite", label: "Noite · 18h às 6h" },
  { value: "plantao_12h_diurno", label: "Plantão 12h diurno" },
  { value: "plantao_12h_noturno", label: "Plantão 12h noturno" },
  { value: "plantao_24h", label: "Plantão 24h" },
] as const;

const EXPERIENCE_OPTIONS = [
  "Menos de 1 ano",
  "De 1 a 2 anos",
  "De 3 a 5 anos",
  "Mais de 5 anos",
];

function fieldValue(data: FormData, key: string): string {
  return String(data.get(key) || "").trim();
}

export function ProfessionalApplicationForm({ turnstileSiteKey = "" }: { turnstileSiteKey?: string }) {
  const [profession, setProfession] = useState("cuidador");
  const requiresCoren = profession === "tecnico_enfermagem" || profession === "enfermeiro";
  const [lgpdAuthorized, setLgpdAuthorized] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "sent-preview" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const availabilityDays = data.getAll("availability_days").map(String);
    const availabilityShifts = data.getAll("availability_shifts").map(String);

    if (availabilityDays.length === 0 || availabilityShifts.length === 0) {
      setStatus("error");
      setError("Selecione pelo menos um dia e um horário disponível.");
      return;
    }

    setStatus("sending");

    try {
      const response = await fetch("/api/professionals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fieldValue(data, "name"),
          email: fieldValue(data, "email"),
          phone: fieldValue(data, "phone"),
          city: fieldValue(data, "city"),
          profession: fieldValue(data, "profession"),
          coren: fieldValue(data, "coren"),
          experience: fieldValue(data, "experience"),
          availability_days: availabilityDays,
          availability_shifts: availabilityShifts,
          available_from: fieldValue(data, "available_from"),
          notes: fieldValue(data, "notes"),
          consent: data.get("consent") === "on",
          company: fieldValue(data, "company"),
          turnstile_token: turnstileToken,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Não foi possível enviar o cadastro agora.");
      }

      form.reset();
      setProfession("cuidador");
      setLgpdAuthorized(false);
      setTurnstileToken("");
      setStatus(result?.preview ? "sent-preview" : "sent");
    } catch (submissionError) {
      setStatus("error");
      setError(submissionError instanceof Error ? submissionError.message : "Erro de conexão. Tente novamente.");
    }
  }

  if (status === "sent" || status === "sent-preview") {
    const previewOnly = status === "sent-preview";
    return (
      <div className="rounded-xl bg-[var(--brand-light)] p-8 text-center" role="status">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand)] text-lg font-bold text-white" aria-hidden="true">✓</span>
        <p className="mt-4 text-lg font-semibold text-[var(--foreground)]">
          {previewOnly ? "Cadastro demonstrado com segurança" : "Cadastro recebido"}
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          {previewOnly
            ? "Esta é uma prévia: os dados preenchidos não foram gravados nem enviados à equipe."
            : "A equipe da Vellora Saúde analisará seus dados profissionais e entrará em contato quando houver uma oportunidade compatível."}
        </p>
        <button
          type="button"
          className="mt-5 text-sm font-semibold text-[var(--brand)] hover:underline"
          onClick={() => setStatus("idle")}
        >
          Fazer outro cadastro
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="professional-company">Empresa</label>
        <input id="professional-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label htmlFor="professional-name" className="form-label">Nome completo *</label>
        <input id="professional-name" name="name" autoComplete="name" required maxLength={120} className="form-control" />
      </div>
      <div>
        <label htmlFor="professional-role" className="form-label">Área profissional *</label>
        <select
          id="professional-role"
          name="profession"
          required
          className="form-control"
          value={profession}
          onChange={(event) => setProfession(event.target.value)}
        >
          {PROFESSIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="professional-phone" className="form-label">Telefone / WhatsApp *</label>
        <input id="professional-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={30} className="form-control" placeholder="(62) 9XXXX-XXXX" />
      </div>
      <div>
        <label htmlFor="professional-email" className="form-label">E-mail *</label>
        <input id="professional-email" name="email" type="email" autoComplete="email" required maxLength={160} className="form-control" />
      </div>
      <div>
        <label htmlFor="professional-city" className="form-label">Cidade *</label>
        <input id="professional-city" name="city" autoComplete="address-level2" required maxLength={100} className="form-control" defaultValue="Goiânia" />
      </div>
      <div>
        <label htmlFor="professional-coren" className="form-label">
          COREN {requiresCoren ? "*" : "(se aplicável)"}
        </label>
        <input
          id="professional-coren"
          name="coren"
          required={requiresCoren}
          maxLength={40}
          className="form-control"
          placeholder="Número e UF"
        />
      </div>
      <div>
        <label htmlFor="professional-experience" className="form-label">Experiência na área *</label>
        <select id="professional-experience" name="experience" required className="form-control" defaultValue="">
          <option value="" disabled>Selecione</option>
          {EXPERIENCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="professional-start" className="form-label">Disponível a partir de</label>
        <input id="professional-start" name="available_from" type="date" className="form-control" />
      </div>

      <fieldset className="sm:col-span-2 rounded-xl border border-[var(--border)] p-4">
        <legend className="px-1 text-sm font-semibold text-[var(--foreground)]">Dias disponíveis *</legend>
        <p className="mb-3 text-xs leading-5 text-[var(--muted)]">Marque todos os dias em que normalmente pode trabalhar.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DAYS.map((day) => (
            <label key={day.value} className="flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5 text-sm text-[var(--foreground)]">
              <input type="checkbox" name="availability_days" value={day.value} className="h-4 w-4 accent-[var(--brand)]" />
              {day.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="sm:col-span-2 rounded-xl border border-[var(--border)] p-4">
        <legend className="px-1 text-sm font-semibold text-[var(--foreground)]">Horários disponíveis *</legend>
        <p className="mb-3 text-xs leading-5 text-[var(--muted)]">Você pode marcar mais de uma opção.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {SHIFTS.map((shift) => (
            <label key={shift.value} className="flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5 text-sm text-[var(--foreground)]">
              <input type="checkbox" name="availability_shifts" value={shift.value} className="h-4 w-4 accent-[var(--brand)]" />
              {shift.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="sm:col-span-2">
        <label htmlFor="professional-notes" className="form-label">Formação, cursos e observações de disponibilidade</label>
        <textarea
          id="professional-notes"
          name="notes"
          rows={4}
          maxLength={1200}
          className="form-control resize-y"
          placeholder="Informe cursos relevantes, tipos de cuidado com que já trabalhou ou detalhes dos horários. Não envie documentos neste formulário."
        />
      </div>

      <label className="sm:col-span-2 flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-xs leading-5 text-[var(--muted)]">
        <input
          type="checkbox"
          name="consent"
          required
          checked={lgpdAuthorized}
          onChange={(event) => setLgpdAuthorized(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--brand)]"
        />
        <span>
          Li e autorizo a Vellora Saúde a tratar os dados informados para analisar meu perfil profissional e entrar
          em contato sobre oportunidades, conforme a Lei Geral de Proteção de Dados (LGPD). Consulte a <Link className="font-semibold text-[var(--brand)] underline" href="/privacidade">Política de Privacidade</Link>. Sei que posso solicitar correção ou exclusão dos meus dados pelos canais da empresa. *
        </span>
      </label>
      <TurnstileWidget siteKey={turnstileSiteKey} onToken={setTurnstileToken} />
      {turnstileSiteKey && <input type="hidden" name="turnstile_token" value={turnstileToken} readOnly />}

      {error ? <p className="sm:col-span-2 text-sm text-[var(--status-critical)]" role="alert" aria-live="polite">{error}</p> : null}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={status === "sending" || !lgpdAuthorized}
          aria-disabled={status === "sending" || !lgpdAuthorized}
          title={!lgpdAuthorized ? "Autorize o uso dos dados para enviar a solicitação" : undefined}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[var(--brand-dark)] px-7 text-sm font-semibold text-white hover:bg-[var(--brand-deep)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === "sending" ? "Enviando..." : "Enviar solicitação"}
        </button>
        {!lgpdAuthorized ? (
          <p className="mt-2 text-xs font-medium text-[var(--brand-dark)]" role="status">
            Marque a autorização de uso dos dados para liberar o envio.
          </p>
        ) : null}
        <p className="mt-3 text-xs leading-5 text-[var(--muted-2)]">
          O envio não garante contratação. A Vellora Saúde poderá solicitar documentos somente em uma etapa posterior da seleção.
        </p>
      </div>
    </form>
  );
}
