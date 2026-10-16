"use client";

import { ChangeEvent, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";

type ProjectionInputs = {
  patientsAtStart: string;
  revenuePerPatient: string;
  directTeamPercent: string;
  fixedCosts: string;
  taxPercent: string;
  availableCash: string;
  horizonMonths: string;
  realisticGrowth: string;
};

type ScenarioKey = "conservative" | "base" | "accelerated";
type ProjectionPoint = {
  month_label: string;
  conservative_revenue: number;
  base_revenue: number;
  accelerated_revenue: number;
};
type ScenarioSpec = {
  key: ScenarioKey;
  label: string;
  growth: number;
  color: string;
};
type ScenarioProjection = ScenarioSpec & {
  finalRevenueCents: number;
  finalCostsCents: number;
  finalMonthlyResultCents: number;
  cumulativeResultCents: number;
  workingCapitalCents: number;
  operatingReserveCents: number;
  recommendedReserveCents: number;
  additionalCashNeededCents: number;
};

const INITIAL_INPUTS: ProjectionInputs = {
  patientsAtStart: "",
  revenuePerPatient: "",
  directTeamPercent: "65",
  fixedCosts: "0",
  taxPercent: "6",
  availableCash: "0",
  horizonMonths: "12",
  realisticGrowth: "3",
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2 text-base text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 sm:text-sm";
const LABEL_CLASS = "block text-sm font-semibold text-[var(--foreground)]";
const MAX_MONTHLY_AMOUNT_CENTS = 1_000_000_000;
const SCENARIO_COLORS = {
  conservative: "#d18b43",
  base: "#24675f",
  accelerated: "#0ca37c",
};

function numberFromInput(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function centsFromInput(value: string): number {
  return Math.min(
    MAX_MONTHLY_AMOUNT_CENTS,
    Math.max(0, Math.round(numberFromInput(value) * 100)),
  );
}

function boundedNumber(value: string, min: number, max: number): number {
  return Math.min(max, Math.max(min, numberFromInput(value)));
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatAxisCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

function formatMonth(value: string): string {
  if (!value) return "";
  const date = new Date(value + "-01T00:00:00Z");
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatChartMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return "Mês " + offset;
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    timeZone: "UTC",
  }).format(date).replace(".", "");
  return label + ". " + String(date.getUTCFullYear()).slice(-2);
}

function NumericField({
  id,
  label,
  value,
  onChange,
  min = "0",
  max,
  step = "1",
  suffix,
  placeholder = "0",
  inputMode = "decimal",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  min?: string;
  max?: string;
  step?: string;
  suffix?: string;
  placeholder?: string;
  inputMode?: "decimal" | "numeric";
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={LABEL_CLASS}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          inputMode={inputMode}
          placeholder={placeholder}
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

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={LABEL_CLASS}>{label}</label>
      <select id={id} value={value} onChange={onChange} className={INPUT_CLASS}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: ScenarioProjection }) {
  return (
    <Card className="min-w-0">
      <div aria-hidden="true" className="mb-4 h-1 w-full rounded-full" style={{ backgroundColor: scenario.color }} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-[var(--foreground)]">{scenario.label}</h4>
          <p className="mt-1 text-xs text-[var(--muted)]">Crescimento de {scenario.growth.toLocaleString("pt-BR")}% ao mês</p>
        </div>
        <span aria-hidden="true" className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: scenario.color }} />
      </div>
      <dl className="mt-4 space-y-3">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
          <dt className="text-sm text-[var(--muted)]">Receita no último mês</dt>
          <dd className="text-right text-sm font-semibold tabular-nums text-[var(--foreground)]">{formatCurrency(scenario.finalRevenueCents)}</dd>
        </div>
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
          <dt className="text-sm text-[var(--muted)]">Resultado operacional acumulado</dt>
          <dd className={"text-right text-sm font-semibold tabular-nums " + (scenario.cumulativeResultCents < 0 ? "text-[var(--status-critical)]" : "text-[var(--foreground)]")}>
            {formatCurrency(scenario.cumulativeResultCents)}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
          <dt className="text-sm text-[var(--muted)]">Resultado operacional no último mês</dt>
          <dd className={"text-right text-sm font-semibold tabular-nums " + (scenario.finalMonthlyResultCents < 0 ? "text-[var(--status-critical)]" : "text-[var(--foreground)]")}>
            {formatCurrency(scenario.finalMonthlyResultCents)}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
          <dt className="text-sm text-[var(--muted)]">Capital de giro estimado</dt>
          <dd className="text-right text-sm font-semibold tabular-nums text-[var(--foreground)]">{formatCurrency(scenario.workingCapitalCents)}</dd>
        </div>
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
          <dt className="text-sm text-[var(--muted)]">Reserva total sugerida</dt>
          <dd className="text-right text-sm font-semibold tabular-nums text-[var(--brand-dark)]">{formatCurrency(scenario.recommendedReserveCents)}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-sm text-[var(--muted)]">Caixa adicional necessário</dt>
          <dd className="text-right text-sm font-semibold tabular-nums text-[var(--foreground)]">{formatCurrency(scenario.additionalCashNeededCents)}</dd>
        </div>
      </dl>
    </Card>
  );
}

export function ProjectionDashboard({
  initialMonth,
  initialActivePatients,
  initialAverageRevenuePerPatientCents,
}: {
  initialMonth: string;
  initialActivePatients: number;
  initialAverageRevenuePerPatientCents: number;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [inputs, setInputs] = useState(INITIAL_INPUTS);

  const projection = useMemo(() => {
    const patientsAtStart = Math.round(boundedNumber(
      inputs.patientsAtStart || String(initialActivePatients),
      0,
      100_000,
    ));
    const revenuePerPatientCents = centsFromInput(
      inputs.revenuePerPatient || String(initialAverageRevenuePerPatientCents / 100),
    );
    const monthlyRevenueCents = Math.min(
      MAX_MONTHLY_AMOUNT_CENTS,
      patientsAtStart * revenuePerPatientCents,
    );
    const fixedCostsCents = centsFromInput(inputs.fixedCosts);
    const availableCashCents = centsFromInput(inputs.availableCash);
    const directTeamPercent = boundedNumber(inputs.directTeamPercent, 0, 100);
    const taxPercent = boundedNumber(inputs.taxPercent, 0, 100);
    const realisticGrowth = boundedNumber(inputs.realisticGrowth, -100, 50);
    const horizonMonths = Math.round(boundedNumber(inputs.horizonMonths, 1, 24));
    const scenarios: ScenarioSpec[] = [
      {
        key: "conservative",
        label: "Conservador",
        growth: Math.max(-100, realisticGrowth - 2),
        color: SCENARIO_COLORS.conservative,
      },
      {
        key: "base",
        label: "Base",
        growth: realisticGrowth,
        color: SCENARIO_COLORS.base,
      },
      {
        key: "accelerated",
        label: "Acelerado",
        growth: Math.min(50, realisticGrowth + 2),
        color: SCENARIO_COLORS.accelerated,
      },
    ];

    const scenarioResults: ScenarioProjection[] = scenarios.map((scenario) => {
      let cumulativeResultCents = 0;
      let finalRevenueCents = monthlyRevenueCents;
      let finalCostsCents = fixedCostsCents + Math.round(monthlyRevenueCents * (directTeamPercent + taxPercent) / 100);

      for (let monthIndex = 1; monthIndex <= horizonMonths; monthIndex += 1) {
        const revenueGrowthFactor = Math.pow(1 + scenario.growth / 100, monthIndex);
        finalRevenueCents = Math.round(monthlyRevenueCents * revenueGrowthFactor);
        const projectedDirectCosts = Math.round(finalRevenueCents * (directTeamPercent + taxPercent) / 100);
        finalCostsCents = fixedCostsCents + projectedDirectCosts;
        cumulativeResultCents += finalRevenueCents - finalCostsCents;
      }

      const receivablesCents = finalRevenueCents;
      const payablesCents = finalCostsCents;
      const workingCapitalCents = Math.max(0, receivablesCents - payablesCents);
      const operatingReserveCents = Math.round(finalCostsCents * 2);
      const recommendedReserveCents = workingCapitalCents + operatingReserveCents;

      return {
        ...scenario,
        finalRevenueCents,
        finalCostsCents,
        finalMonthlyResultCents: finalRevenueCents - finalCostsCents,
        cumulativeResultCents,
        workingCapitalCents,
        operatingReserveCents,
        recommendedReserveCents,
        additionalCashNeededCents: Math.max(0, recommendedReserveCents - availableCashCents),
      };
    });

    const chartData: ProjectionPoint[] = [];
    for (let monthIndex = 0; monthIndex <= horizonMonths; monthIndex += 1) {
      chartData.push({
        month_label: formatChartMonth(month, monthIndex),
        conservative_revenue: Math.round(monthlyRevenueCents * Math.pow(1 + scenarioResults[0].growth / 100, monthIndex)),
        base_revenue: Math.round(monthlyRevenueCents * Math.pow(1 + scenarioResults[1].growth / 100, monthIndex)),
        accelerated_revenue: Math.round(monthlyRevenueCents * Math.pow(1 + scenarioResults[2].growth / 100, monthIndex)),
      });
    }

    return {
      scenarios: scenarioResults,
      chartData,
      horizonMonths,
      hasBaseline: monthlyRevenueCents > 0 || fixedCostsCents > 0,
    };
  }, [inputs, month, initialActivePatients, initialAverageRevenuePerPatientCents]);

  function updateInput(key: keyof ProjectionInputs) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setInputs((current) => ({ ...current, [key]: value }));
    };
  }

  function updateSelect(key: keyof ProjectionInputs) {
    return (event: ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setInputs((current) => ({ ...current, [key]: value }));
    };
  }

  const reserveChartData = projection.scenarios.map((scenario) => ({
    name: scenario.label,
    workingCapitalCents: scenario.workingCapitalCents,
    operatingReserveCents: scenario.operatingReserveCents,
  }));

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-dark)]">
            Vellora / operação
          </p>
          <h2 className="mt-2 font-serif text-3xl font-normal leading-tight text-[var(--brand-deep)] sm:text-4xl">
            Projeções
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Compare cenários de crescimento e planeje o capital de giro e a reserva de caixa.
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div>
            <label htmlFor="projection-month" className="block text-xs font-medium text-[var(--muted)]">Início da projeção</label>
            <input
              id="projection-month"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className={INPUT_CLASS + " sm:min-w-48"}
            />
          </div>
          <div className="sm:min-w-44">
            <SelectField
              id="projection-horizon"
              label="Horizonte"
              value={inputs.horizonMonths}
              onChange={updateSelect("horizonMonths")}
              options={[
                { value: "3", label: "3 meses" },
                { value: "6", label: "6 meses" },
                { value: "12", label: "12 meses" },
                { value: "18", label: "18 meses" },
                { value: "24", label: "24 meses" },
              ]}
            />
          </div>
        </div>
      </header>

      <section aria-labelledby="projection-inputs-title">
        <Card className="min-w-0">
          <div className="mb-5">
            <h3 id="projection-inputs-title" className="font-serif text-2xl font-normal text-[var(--brand-deep)]">
              Parâmetros da projeção
            </h3>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Campos vazios usam a base atual de pacientes ativos e cobranças. Altere os valores para simular decisões.
            </p>
          </div>

          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <div>
              <NumericField
                id="projection-patients"
                label="Pacientes no início"
                value={inputs.patientsAtStart}
                onChange={updateInput("patientsAtStart")}
                step="1"
                inputMode="numeric"
                placeholder="Pacientes ativos como padrão"
              />
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                Padrão atual: {initialActivePatients} {initialActivePatients === 1 ? "paciente ativo" : "pacientes ativos"}.
              </p>
            </div>
            <div>
              <NumericField
                id="projection-revenue-per-patient"
                label="Receita mensal por paciente (R$)"
                value={inputs.revenuePerPatient}
                onChange={updateInput("revenuePerPatient")}
                step="0.01"
                placeholder="Média das cobranças como padrão"
              />
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                Referência: cobranças de {formatMonth(initialMonth)} ÷ {initialActivePatients} pacientes ativos = {formatCurrency(initialAverageRevenuePerPatientCents)} por paciente.
              </p>
            </div>
            <NumericField
              id="projection-direct-team-cost"
              label="Custo direto da equipe (%)"
              value={inputs.directTeamPercent}
              onChange={updateInput("directTeamPercent")}
              max="100"
              step="0.1"
              suffix="%"
            />
            <NumericField
              id="projection-fixed-costs"
              label="Despesas fixas mensais (R$)"
              value={inputs.fixedCosts}
              onChange={updateInput("fixedCosts")}
              step="0.01"
            />
            <NumericField
              id="projection-tax"
              label="Tributos estimados (%)"
              value={inputs.taxPercent}
              onChange={updateInput("taxPercent")}
              max="100"
              step="0.1"
              suffix="%"
            />
            <NumericField
              id="projection-realistic-growth"
              label="Crescimento mensal realista (%)"
              value={inputs.realisticGrowth}
              onChange={updateInput("realisticGrowth")}
              min="-100"
              max="50"
              step="0.1"
              suffix="%"
            />
            <NumericField
              id="projection-cash"
              label="Caixa disponível hoje (R$)"
              value={inputs.availableCash}
              onChange={updateInput("availableCash")}
              step="0.01"
            />
          </div>
        </Card>
      </section>

      {!projection.hasBaseline && (
        <p role="status" className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--brand-light)] px-4 py-3 text-sm leading-5 text-[var(--brand-dark)]">
          Informe uma receita por paciente ou use as cobranças registradas para visualizar os cenários.
        </p>
      )}

      <section className="mt-7" aria-labelledby="projection-scenarios-title">
        <div className="mb-4">
          <h3 id="projection-scenarios-title" className="font-serif text-2xl font-normal text-[var(--brand-deep)]">
            Comparação de cenários
          </h3>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Resultados ao fim de {projection.horizonMonths} meses, considerando o crescimento mensal realista informado.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {projection.scenarios.map((scenario) => (
            <ScenarioCard key={scenario.key} scenario={scenario} />
          ))}
        </div>
      </section>

      <section className="mt-6 grid min-w-0 gap-4 xl:grid-cols-2" aria-label="Gráficos das projeções">
        <Card className="min-w-0">
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Receita mensal projetada</h3>
            <p className="mt-1 text-sm leading-5 text-[var(--muted)]">Evolução da receita nos três cenários.</p>
          </div>
          {projection.hasBaseline ? (
            <div className="mt-4 h-72 min-w-0 sm:h-80" role="img" aria-label="Gráfico da receita mensal nos cenários conservador, base e acelerado">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projection.chartData} margin={{ top: 10, right: 8, left: 2, bottom: 0 }}>
                  <CartesianGrid stroke="#e4ebe9" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="month_label" tick={{ fontSize: 11, fill: "#58706b" }} axisLine={{ stroke: "#e4ebe9" }} tickLine={false} />
                  <YAxis tickFormatter={(value) => formatAxisCurrency(Number(value))} tick={{ fontSize: 11, fill: "#58706b" }} axisLine={false} tickLine={false} width={68} />
                  <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), String(name)]} labelFormatter={(label) => String(label)} contentStyle={{ borderRadius: 12, border: "1px solid #e4ebe9", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Line dataKey="conservative_revenue" name="Conservador" type="monotone" stroke={SCENARIO_COLORS.conservative} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  <Line dataKey="base_revenue" name="Base" type="monotone" stroke={SCENARIO_COLORS.base} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  <Line dataKey="accelerated_revenue" name="Acelerado" type="monotone" stroke={SCENARIO_COLORS.accelerated} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4 flex min-h-72 items-center justify-center rounded-xl bg-[var(--surface-soft)] px-5 text-center text-sm leading-6 text-[var(--muted)]">
              Informe uma receita por paciente ou registre cobranças para ver as curvas de crescimento.
            </div>
          )}
        </Card>

        <Card className="min-w-0">
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Reserva de caixa sugerida</h3>
            <p className="mt-1 text-sm leading-5 text-[var(--muted)]">Capital de giro e meses de reserva operacional.</p>
          </div>
          {projection.hasBaseline ? (
            <div className="mt-4 h-72 min-w-0 sm:h-80" role="img" aria-label="Gráfico comparativo da composição da reserva sugerida">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reserveChartData} margin={{ top: 10, right: 8, left: 2, bottom: 0 }}>
                  <CartesianGrid stroke="#e4ebe9" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#58706b" }} axisLine={{ stroke: "#e4ebe9" }} tickLine={false} />
                  <YAxis tickFormatter={(value) => formatAxisCurrency(Number(value))} tick={{ fontSize: 11, fill: "#58706b" }} axisLine={false} tickLine={false} width={68} />
                  <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), String(name)]} contentStyle={{ borderRadius: 12, border: "1px solid #e4ebe9", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="workingCapitalCents" name="Capital de giro" stackId="reserve" fill={SCENARIO_COLORS.base} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="operatingReserveCents" name="Reserva operacional" stackId="reserve" fill="#8bc7bc" radius={[5, 5, 0, 0]} maxBarSize={54} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4 flex min-h-72 items-center justify-center rounded-xl bg-[var(--surface-soft)] px-5 text-center text-sm leading-6 text-[var(--muted)]">
              Informe a receita por paciente para estimar a necessidade de caixa.
            </div>
          )}
        </Card>
      </section>

      <p className="mt-5 max-w-5xl text-xs leading-5 text-[var(--muted)]">
        Estimativa simplificada: receita inicial = pacientes × receita mensal por paciente. O cenário Base usa a taxa realista; Conservador usa 2 pontos percentuais a menos e Acelerado, 2 pontos a mais. Custos diretos da equipe e tributos incidem sobre a receita; despesas fixas permanecem constantes. O capital de giro considera um mês de receita menos um mês de despesas, limitado a zero, e a reserva sugerida soma dois meses de despesas. Não considera sazonalidade, inadimplência, investimentos ou alterações nos contratos; revise as premissas com seu contador.
      </p>
    </div>
  );
}
