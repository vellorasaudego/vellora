"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";

type PricingInputs = {
  shiftCost: string;
  shiftsPerMonth: string;
  additionalPerShift: string;
  operationReserve: string;
  estimatedTaxes: string;
  desiredMargin: string;
};

const INITIAL_INPUTS: PricingInputs = {
  shiftCost: "115",
  shiftsPerMonth: "15",
  additionalPerShift: "0",
  operationReserve: "8",
  estimatedTaxes: "6",
  desiredMargin: "20",
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2 text-base text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 sm:text-sm";
const LABEL_CLASS = "block text-sm font-semibold text-[var(--foreground)]";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatMonth(value: string): string {
  const date = new Date(value + "-01T00:00:00Z");
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function centsFromInput(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : 0;
}

function percentageFromInput(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function Field({
  id,
  label,
  value,
  onChange,
  min = "0",
  max,
  step,
  inputMode = "decimal",
  suffix,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  min?: string;
  max?: string;
  step: string;
  inputMode?: "decimal" | "numeric";
  suffix?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          inputMode={inputMode}
          value={value}
          onChange={onChange}
          className={INPUT_CLASS + (suffix ? " pr-12" : "")}
        />
        {suffix && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center pt-1 text-sm text-[var(--muted)]">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function PricingCalculator({ initialMonth }: { initialMonth: string }) {
  const [month, setMonth] = useState(initialMonth);
  const [inputs, setInputs] = useState(INITIAL_INPUTS);

  const estimate = useMemo(() => {
    const shiftCostCents = centsFromInput(inputs.shiftCost);
    const additionalCents = centsFromInput(inputs.additionalPerShift);
    const shiftCount = Math.max(0, Math.floor(Number(inputs.shiftsPerMonth) || 0));
    const reserve = percentageFromInput(inputs.operationReserve);
    const taxes = percentageFromInput(inputs.estimatedTaxes);
    const margin = percentageFromInput(inputs.desiredMargin);
    const teamCostCents = (shiftCostCents + additionalCents) * shiftCount;
    const minimumDenominator = 1 - (reserve + taxes) / 100;
    const suggestedDenominator = minimumDenominator - margin / 100;

    return {
      teamCostCents,
      shiftCount,
      reserve,
      taxes,
      margin,
      minimumPriceCents: minimumDenominator > 0
        ? Math.round(teamCostCents / minimumDenominator)
        : null,
      suggestedPriceCents: suggestedDenominator > 0
        ? Math.round(teamCostCents / suggestedDenominator)
        : null,
    };
  }, [inputs]);

  function updateInput(key: keyof PricingInputs) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setInputs((current) => ({ ...current, [key]: value }));
    };
  }

  const percentageTotal = estimate.reserve + estimate.taxes + estimate.margin;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-dark)]">
            Vellora / operação
          </p>
          <h2 className="mt-2 font-serif text-3xl font-normal leading-tight text-[var(--brand-deep)] sm:text-4xl">
            Precificação
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Simule o valor antes de enviar uma proposta.
          </p>
        </div>

        <div className="w-full sm:w-auto">
          <label htmlFor="pricing-month" className="block text-xs font-medium text-[var(--muted)]">
            Competência
          </label>
          <input
            id="pricing-month"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className={INPUT_CLASS + " sm:min-w-48"}
          />
          <span className="sr-only">{formatMonth(month)}</span>
        </div>
      </header>

      <section className="grid min-w-0 gap-4 lg:grid-cols-[1.06fr_.94fr]" aria-label="Simulador de preço mensal">
        <Card className="min-w-0">
          <div className="mb-4">
            <h3 className="font-serif text-2xl font-normal text-[var(--brand-deep)]">Simular proposta</h3>
            <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
              Informe valores reais para uma estimativa mensal.
            </p>
          </div>

          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
            <Field
              id="pricing-shift-cost"
              label="Custo por plantão (R$)"
              value={inputs.shiftCost}
              onChange={updateInput("shiftCost")}
              step="0.01"
            />
            <Field
              id="pricing-shifts"
              label="Plantões no mês"
              value={inputs.shiftsPerMonth}
              onChange={updateInput("shiftsPerMonth")}
              step="1"
              inputMode="numeric"
            />
            <Field
              id="pricing-additional"
              label="Adicionais por plantão (R$)"
              value={inputs.additionalPerShift}
              onChange={updateInput("additionalPerShift")}
              step="0.01"
            />
            <Field
              id="pricing-reserve"
              label="Operação e reserva (%)"
              value={inputs.operationReserve}
              onChange={updateInput("operationReserve")}
              max="100"
              step="0.1"
              suffix="%"
            />
            <Field
              id="pricing-taxes"
              label="Impostos estimados (%)"
              value={inputs.estimatedTaxes}
              onChange={updateInput("estimatedTaxes")}
              max="100"
              step="0.1"
              suffix="%"
            />
            <Field
              id="pricing-margin"
              label="Margem desejada (%)"
              value={inputs.desiredMargin}
              onChange={updateInput("desiredMargin")}
              max="100"
              step="0.1"
              suffix="%"
            />
          </div>
        </Card>

        <div className="min-w-0 rounded-2xl border border-white/10 bg-[var(--brand-dark)] p-6 text-white shadow-[0_12px_35px_rgba(8,54,49,0.12)]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#bfe7de]">
              Valor mensal sugerido
            </p>
            <p className="mt-5 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
              {estimate.suggestedPriceCents === null ? "—" : formatCurrency(estimate.suggestedPriceCents)}
            </p>
            <p className="mt-2 text-sm text-[#d8eee9]">
              Estimativa para {estimate.shiftCount} {estimate.shiftCount === 1 ? "plantão" : "plantões"}
              {month ? " em " + formatMonth(month) : ""}
            </p>
          </div>

          <dl className="mt-4 divide-y divide-white/20">
            <div className="flex items-center justify-between gap-4 py-3 text-sm">
              <dt>Custo da equipe</dt>
              <dd className="font-semibold tabular-nums">{formatCurrency(estimate.teamCostCents)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3 text-sm">
              <dt>Preço mínimo sem margem</dt>
              <dd className="font-semibold tabular-nums">
                {estimate.minimumPriceCents === null ? "—" : formatCurrency(estimate.minimumPriceCents)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3 text-sm">
              <dt>Margem pretendida</dt>
              <dd className="font-semibold tabular-nums">{estimate.margin.toLocaleString("pt-BR")}%</dd>
            </div>
          </dl>

          {percentageTotal >= 100 ? (
            <p role="alert" className="mt-4 rounded-xl border border-white/20 bg-white/10 p-3 text-sm leading-5 text-white">
              Operação, impostos e margem precisam somar menos de 100% para calcular o preço sugerido.
            </p>
          ) : (
            <p className="mt-4 rounded-xl border border-white/20 bg-white/10 p-3 text-sm leading-5 text-[#e6f3f0]">
              A calculadora usa percentuais sobre a receita. Confirme impostos, encargos e adicionais com seu contador antes de enviar a proposta.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
