"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Badge";
import type {
  DashboardData,
  DashboardPeriod,
  EntryPoint,
  OperationalPoint,
} from "./dashboard-utils";
import {
  buildEntrySeries,
  buildOperationalDistribution,
  DASHBOARD_PERIODS,
  getDashboardMetrics,
  getPeriodLabel,
  sortByCreatedAtDescending,
} from "./dashboard-utils";

const numberFormatter = new Intl.NumberFormat("pt-BR");
const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

const CHART_GRID = "#e4ebe9";
const CHART_AXIS = "#7b908b";
const CHART_PRIMARY = "#24675f";
const CHART_SECONDARY = "#e99b63";

type StatCardProps = {
  label: string;
  value: string | number;
  helper: string;
  href: string;
};

function StatCard({ label, value, helper, href }: StatCardProps) {
  return (
    <Link href={href} className="block min-w-0 rounded-2xl focus-visible:outline-offset-2">
      <Card className="h-full transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(8,54,49,0.1)]">
        <p className="text-sm font-medium text-[var(--muted-2)]">{label}</p>
        <p className="mt-2 tabular-nums text-3xl font-semibold leading-none text-[var(--foreground)]">{value}</p>
        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{helper}</p>
      </Card>
    </Link>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl bg-[var(--surface-soft)] px-5 py-8 text-center">
      <p className="font-semibold text-[var(--foreground)]">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-6 text-[var(--muted)]">{description}</p>
    </div>
  );
}

function formatPercentage(value: number) {
  return `${percentFormatter.format(value)}%`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

function entrySummary(entries: EntryPoint[], periodLabel: string) {
  const leads = entries.reduce((total, entry) => total + entry.leads, 0);
  const applications = entries.reduce((total, entry) => total + entry.applications, 0);
  return `No período de ${periodLabel}, foram registrados ${leads} ${leads === 1 ? "lead" : "leads"} e ${applications} ${applications === 1 ? "candidatura" : "candidaturas"}.`;
}

function operationalSummary(points: OperationalPoint[]) {
  return `Distribuição atual: ${points.map((point) => `${point.label}, ${point.value}`).join("; ")}.`;
}

function RecentLeads({ leads }: { leads: DashboardData["leads"] }) {
  const recentLeads = sortByCreatedAtDescending(leads).slice(0, 5);

  return (
    <Card>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-[var(--foreground)]">Contatos recentes</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Acompanhe os últimos contatos recebidos.</p>
        </div>
        <Link href="/admin/leads" className="self-start text-sm font-semibold text-[var(--brand)] hover:underline sm:self-auto">
          Ver todos
        </Link>
      </div>
      {recentLeads.length > 0 ? (
        <ul className="mt-5 divide-y divide-[var(--border)]">
          {recentLeads.map((lead) => (
            <li key={lead.id} className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--foreground)]">{lead.name}</p>
                <p className="text-sm text-[var(--muted-2)]">{lead.phone}</p>
              </div>
              <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-1">
                <Pill value={lead.status} />
                <time className="text-xs text-[var(--muted-2)]" dateTime={lead.created_at}>
                  {formatDate(lead.created_at)}
                </time>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-xl bg-[var(--surface-soft)] p-4 text-sm text-[var(--muted)]">
          Nenhum contato recebido ainda.
        </p>
      )}
    </Card>
  );
}

function RecentPatients({ patients }: { patients: DashboardData["patients"] }) {
  const recentPatients = sortByCreatedAtDescending(patients).slice(0, 5);

  return (
    <Card>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-[var(--foreground)]">Pacientes recentes</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Veja os últimos cadastros da operação.</p>
        </div>
        <Link href="/admin/pacientes" className="self-start text-sm font-semibold text-[var(--brand)] hover:underline sm:self-auto">
          Ver todos
        </Link>
      </div>
      {recentPatients.length > 0 ? (
        <ul className="mt-5 divide-y divide-[var(--border)]">
          {recentPatients.map((patient) => (
            <li key={patient.id} className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--foreground)]">{patient.name}</p>
                <p className="text-sm text-[var(--muted-2)]">{patient.care_level || "Plano a definir"}</p>
              </div>
              <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-1">
                <Pill value={patient.status} />
                <time className="text-xs text-[var(--muted-2)]" dateTime={patient.created_at}>
                  {formatDate(patient.created_at)}
                </time>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-xl bg-[var(--surface-soft)] p-4 text-sm text-[var(--muted)]">
          Nenhum paciente cadastrado ainda.
        </p>
      )}
    </Card>
  );
}

function Shortcuts() {
  const shortcuts = [
    { label: "Gerenciar contatos", description: "Acompanhar leads abertos", href: "/admin/leads" },
    { label: "Revisar candidaturas", description: "Analisar novos profissionais", href: "/admin/profissionais" },
    { label: "Ver pacientes", description: "Abrir a base de pacientes", href: "/admin/pacientes" },
    { label: "Abrir banco profissional", description: "Gerenciar acessos e perfis", href: "/admin/cuidadores" },
  ];

  return (
    <Card>
      <h3 className="font-semibold text-[var(--foreground)]">Atalhos</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">Acesse rapidamente as áreas mais usadas.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {shortcuts.map((shortcut) => (
          <Link
            key={shortcut.href}
            href={shortcut.href}
            className="rounded-xl border border-[var(--border)] p-4 transition-colors duration-150 hover:border-[var(--brand)] hover:bg-[var(--brand-light)]"
          >
            <span className="block font-semibold text-[var(--brand-dark)]">{shortcut.label}</span>
            <span className="mt-1 block text-sm leading-5 text-[var(--muted)]">{shortcut.description}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

export default function AdminDashboard({ data, asOf }: { data: DashboardData; asOf: string }) {
  const [period, setPeriod] = useState<DashboardPeriod>("6m");
  const now = useMemo(() => new Date(asOf), [asOf]);
  const metrics = useMemo(() => getDashboardMetrics(data, period, now), [data, now, period]);
  const entries = useMemo(() => buildEntrySeries(data, period, now), [data, now, period]);
  const operational = useMemo(() => buildOperationalDistribution(data), [data]);
  const periodLabel = getPeriodLabel(period);
  const entriesText = entrySummary(entries, periodLabel);
  const operationalText = operationalSummary(operational);

  const stats: StatCardProps[] = [
    {
      label: "Contatos abertos",
      value: numberFormatter.format(metrics.openContacts),
      helper: "Novos ou em contato",
      href: "/admin/leads",
    },
    {
      label: "Candidaturas abertas",
      value: numberFormatter.format(metrics.openApplications),
      helper: "Novas ou em análise",
      href: "/admin/profissionais",
    },
    {
      label: "Pacientes ativos",
      value: numberFormatter.format(metrics.activePatients),
      helper: "Status atual",
      href: "/admin/pacientes",
    },
    {
      label: "Profissionais ativos",
      value: numberFormatter.format(metrics.activeProfessionals),
      helper: "Acesso ativo",
      href: "/admin/cuidadores",
    },
    {
      label: "Taxa de conversão",
      value: formatPercentage(metrics.conversionRate),
      helper: `${periodLabel} · ${metrics.convertedLeadsInPeriod} convertidos`,
      href: "/admin/leads",
    },
    {
      label: "Pacientes pendentes",
      value: numberFormatter.format(metrics.pendingPatients),
      helper: "Status atual",
      href: "/admin/pacientes",
    },
    {
      label: "Pacientes sem família",
      value: numberFormatter.format(metrics.patientsWithoutFamily),
      helper: "Precisam de vínculo",
      href: "/admin/pacientes",
    },
    {
      label: "Profissionais aguardando acesso",
      value: numberFormatter.format(metrics.professionalsWaitingAccess),
      helper: "Perfil aprovado sem acesso",
      href: "/admin/cuidadores",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-dark)]">Visão geral</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-[var(--foreground)] sm:text-3xl">
            Acompanhe a operação da Vellora Saúde
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Os indicadores operacionais mostram o estado atual. O período selecionado controla as entradas e a taxa de conversão.
          </p>
        </div>

        <div className="min-w-0" role="group" aria-labelledby="dashboard-period-label">
          <p id="dashboard-period-label" className="mb-2 text-sm font-semibold text-[var(--foreground)]">
            Período de entradas
          </p>
          <div className="flex flex-wrap gap-2">
            {DASHBOARD_PERIODS.map((option) => {
              const selected = option.value === period;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setPeriod(option.value)}
                  className={`min-h-11 rounded-xl border px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-offset-2 ${
                    selected
                      ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand-dark)]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <section aria-labelledby="dashboard-metrics-title">
        <h2 id="dashboard-metrics-title" className="sr-only">Indicadores administrativos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
        </div>
      </section>

      <section className="mt-7 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]" aria-labelledby="dashboard-charts-title">
        <h2 id="dashboard-charts-title" className="sr-only">Análises da operação</h2>
        <Card className="min-w-0">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-semibold text-[var(--foreground)]">Entradas no período</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">Leads e candidaturas recebidos ao longo de {periodLabel.toLowerCase()}.</p>
            </div>
            <span className="text-xs font-medium text-[var(--muted-2)]">Comparativo</span>
          </div>
          {entries.length > 0 ? (
            <div className="mt-5 min-w-0">
              <div role="img" aria-label="Gráfico de entradas comparando leads e candidaturas" aria-describedby="entries-summary">
                <div className="h-64 min-w-0 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={entries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke={CHART_GRID} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={false} tickLine={false} width={32} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: `1px solid ${CHART_GRID}`, fontSize: 12 }}
                        cursor={{ fill: "rgba(36, 103, 95, 0.06)" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="leads" name="Leads" fill={CHART_PRIMARY} radius={[5, 5, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="applications" name="Candidaturas" fill={CHART_SECONDARY} radius={[5, 5, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]" id="entries-summary">{entriesText}</p>
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState title="Sem entradas neste período" description="Selecione outro período ou aguarde novos leads e candidaturas." />
            </div>
          )}
        </Card>

        <Card className="min-w-0">
          <div>
            <h3 className="font-semibold text-[var(--foreground)]">Distribuição operacional</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">Situação atual de pacientes e profissionais.</p>
          </div>
          {operational.some((point) => point.value > 0) ? (
            <div className="mt-5 min-w-0">
              <div role="img" aria-label="Gráfico da distribuição operacional atual" aria-describedby="operational-summary">
                <div className="h-64 min-w-0 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={operational} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={CHART_GRID} horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
                      <YAxis type="category" dataKey="label" width={112} tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: `1px solid ${CHART_GRID}`, fontSize: 12 }}
                        cursor={{ fill: "rgba(36, 103, 95, 0.06)" }}
                      />
                      <Bar dataKey="value" name="Cadastros" fill={CHART_PRIMARY} radius={[0, 5, 5, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]" id="operational-summary">{operationalText}</p>
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState title="Operação sem registros" description="Os indicadores aparecerão quando houver pacientes ou profissionais cadastrados." />
            </div>
          )}
        </Card>
      </section>

      <section className="mt-7 grid min-w-0 gap-6 xl:grid-cols-2" aria-labelledby="dashboard-recent-title">
        <h2 id="dashboard-recent-title" className="sr-only">Atividade recente e atalhos</h2>
        <RecentLeads leads={data.leads} />
        <RecentPatients patients={data.patients} />
      </section>

      <section className="mt-6" aria-label="Atalhos administrativos">
        <Shortcuts />
      </section>
    </div>
  );
}
