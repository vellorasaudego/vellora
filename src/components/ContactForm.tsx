"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { TurnstileWidget } from "./TurnstileWidget";

const CARE_TYPES = [
  "Ainda não sei",
  "Cuidador 12h ou 24h",
  "Técnico de enfermagem",
  "Pós-operatório",
  "Cuidados paliativos",
  "Fisioterapia domiciliar",
  "Mobilidade reduzida",
  "Cuidado ao idoso",
];

const SCHEDULES = [
  "A definir",
  "12h diurno",
  "12h noturno",
  "24 horas",
  "Visitas programadas",
];

const URGENCY_OPTIONS = [
  "Sem urgência",
  "Nos próximos 30 dias",
  "Nos próximos 7 dias",
  "O quanto antes",
];

function formValue(data: FormData, key: string): string {
  return String(data.get(key) || "").trim();
}

export function ContactForm({
  turnstileSiteKey = "",
  turnstileRequired = false,
}: {
  turnstileSiteKey?: string;
  turnstileRequired?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "sent-preview" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileUnavailable = turnstileRequired && !turnstileSiteKey;
  const turnstilePending = Boolean(turnstileSiteKey) && !turnstileToken;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError(null);

    const form = event.currentTarget;
    if (turnstileUnavailable) {
      setError("A proteção de segurança está indisponível. A solicitação não pode ser enviada agora.");
      setStatus("error");
      return;
    }
    if (turnstilePending) {
      setError("Conclua a verificação de segurança para liberar o envio.");
      setStatus("error");
      return;
    }
    const data = new FormData(form);
    const structuredDetails = [
      ["Idade do paciente", formValue(data, "patient_age")],
      ["Horário necessário", formValue(data, "schedule")],
      ["Grau de parentesco", formValue(data, "relationship")],
      ["Cidade", formValue(data, "city")],
      ["Data de início desejada", formValue(data, "start_date")],
      ["Urgência", formValue(data, "urgency")],
    ]
      .filter(([, value]) => value)
      .map(([label, value]) => `${label}: ${value}`);
    const freeMessage = formValue(data, "message");
    const message = [...structuredDetails, freeMessage ? `Mensagem: ${freeMessage}` : ""].filter(Boolean).join("\n");

    const payload = {
      name: formValue(data, "name"),
      email: formValue(data, "email"),
      phone: formValue(data, "phone"),
      patient_name: formValue(data, "patient_name"),
      care_type: formValue(data, "care_type"),
      message,
      consent: data.get("consent") === "on",
      company: formValue(data, "company"),
      turnstile_token: turnstileToken,
    };

    try {
      const response = await fetch("/api/solicitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });
      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json")
        ? await response.json()
        : { error: "O servidor não conseguiu concluir o envio. Tente novamente." };

      if (!response.ok) {
        setError(result.error || "Não foi possível enviar. Tente novamente.");
        setStatus("error");
        return;
      }

      setStatus(result.preview ? "sent-preview" : "sent");
      setTurnstileToken("");
      form.reset();
    } catch (requestError) {
      console.error("[ContactForm] Falha ao enviar solicitação.", requestError);
      setError("Não foi possível enviar. Verifique sua conexão e tente novamente.");
      setStatus("error");
    }
  }

  if (status === "sent" || status === "sent-preview") {
    const previewOnly = status === "sent-preview";
    return (
      <div className="rounded-xl border border-[#bfe7df] bg-[var(--brand-light)] p-8 text-center" role="status">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand)] text-lg font-bold text-white" aria-hidden="true">✓</span>
        <p className="mt-4 text-lg font-semibold text-[var(--foreground)]">
          {previewOnly ? "Formulário demonstrado com segurança" : "Recebemos sua solicitação"}
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          {previewOnly
            ? "Esta é uma prévia: os dados preenchidos não foram gravados nem enviados à equipe."
            : "A equipe da Vellora vai analisar as informações e entrar em contato para entender melhor a necessidade da sua família."}
        </p>
        <button
          type="button"
          className="mt-5 text-sm font-semibold text-[var(--brand)] hover:underline"
          onClick={() => setStatus("idle")}
        >
          Enviar outra solicitação
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-company">Empresa</label>
        <input id="contact-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <label htmlFor="contact-patient" className="form-label">Nome do paciente *</label>
        <input id="contact-patient" name="patient_name" autoComplete="off" required className="form-control" />
      </div>
      <div>
        <label htmlFor="contact-age" className="form-label">Idade do paciente</label>
        <input id="contact-age" name="patient_age" type="number" min="0" max="120" inputMode="numeric" className="form-control" />
      </div>
      <div>
        <label htmlFor="contact-care" className="form-label">Tipo de cuidado *</label>
        <select id="contact-care" name="care_type" required className="form-control" defaultValue={CARE_TYPES[0]}>
          {CARE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="contact-schedule" className="form-label">Horário necessário</label>
        <select id="contact-schedule" name="schedule" className="form-control" defaultValue={SCHEDULES[0]}>
          {SCHEDULES.map((schedule) => <option key={schedule} value={schedule}>{schedule}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="contact-name" className="form-label">Seu nome *</label>
        <input id="contact-name" name="name" autoComplete="name" required className="form-control" />
      </div>
      <div>
        <label htmlFor="contact-relationship" className="form-label">Grau de parentesco</label>
        <input id="contact-relationship" name="relationship" className="form-control" placeholder="Filho(a), neto(a)..." />
      </div>
      <div>
        <label htmlFor="contact-phone" className="form-label">Telefone / WhatsApp *</label>
        <input id="contact-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required className="form-control" placeholder="(62) 9XXXX-XXXX" />
      </div>
      <div>
        <label htmlFor="contact-email" className="form-label">E-mail *</label>
        <input id="contact-email" name="email" type="email" autoComplete="email" required className="form-control" />
      </div>
      <div>
        <label htmlFor="contact-city" className="form-label">Cidade</label>
        <input id="contact-city" name="city" autoComplete="address-level2" className="form-control" defaultValue="Goiânia" />
      </div>
      <div>
        <label htmlFor="contact-start" className="form-label">Data de início desejada</label>
        <input id="contact-start" name="start_date" type="date" className="form-control" />
      </div>
      <div>
        <label htmlFor="contact-urgency" className="form-label">Urgência</label>
        <select id="contact-urgency" name="urgency" className="form-control" defaultValue={URGENCY_OPTIONS[0]}>
          {URGENCY_OPTIONS.map((urgency) => <option key={urgency} value={urgency}>{urgency}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="contact-message" className="form-label">Mensagem</label>
        <textarea id="contact-message" name="message" rows={4} className="form-control resize-y" placeholder="Conte brevemente quais atividades exigem ajuda. Não envie documentos médicos." />
      </div>
      <label className="sm:col-span-2 flex cursor-pointer items-start gap-3 rounded-lg bg-[var(--surface-soft)] p-3 text-xs leading-5 text-[var(--muted)]">
        <input name="consent" type="checkbox" required className="mt-1 h-4 w-4 shrink-0 accent-[var(--brand)]" />
        <span>
          Autorizo o uso destes dados exclusivamente para que a Vellora entre em contato sobre esta solicitação. Consulte a <Link className="font-semibold text-[var(--brand)] underline" href="/privacidade">Política de Privacidade</Link>.
        </span>
      </label>
      <TurnstileWidget siteKey={turnstileSiteKey} required={turnstileRequired} onToken={setTurnstileToken} />
      {turnstileSiteKey && <input type="hidden" name="turnstile_token" value={turnstileToken} readOnly />}
      {error ? <p className="sm:col-span-2 text-sm text-[var(--status-critical)]" role="alert" aria-live="polite">{error}</p> : null}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={status === "sending" || turnstileUnavailable || turnstilePending}
          aria-disabled={status === "sending" || turnstileUnavailable || turnstilePending}
          title={
            turnstileUnavailable
              ? "A proteção de segurança está temporariamente indisponível"
              : turnstilePending
                ? "Conclua a verificação de segurança para enviar"
                : undefined
          }
          className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[var(--brand-dark)] px-7 text-sm font-semibold text-white hover:bg-[var(--brand-deep)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "sending" ? "Enviando..." : "Enviar solicitação"}
        </button>
        {turnstileUnavailable ? (
          <p className="mt-2 text-xs font-medium text-[var(--status-critical)]" role="status">
            O envio ficará disponível quando a proteção de segurança for configurada.
          </p>
        ) : null}
        <p className="mt-3 text-xs leading-5 text-[var(--muted-2)]">
          Evite compartilhar informações clínicas sensíveis neste primeiro contato.
        </p>
      </div>
    </form>
  );
}
