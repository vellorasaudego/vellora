import type {
  CaregiverProfile,
  Lead,
  Patient,
  ProfessionalApplication,
} from "@/lib/data";

export const DASHBOARD_PERIODS = [
  { value: "7d", label: "1 semana" },
  { value: "1m", label: "1 mês" },
  { value: "6m", label: "6 meses" },
  { value: "1y", label: "1 ano" },
  { value: "all", label: "Todo histórico" },
] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number]["value"];

export type DashboardData = {
  leads: Lead[];
  patients: Patient[];
  caregivers: CaregiverProfile[];
  professionalApplications: ProfessionalApplication[];
};

export type DashboardMetrics = {
  openContacts: number;
  openApplications: number;
  activePatients: number;
  activeProfessionals: number;
  conversionRate: number;
  pendingPatients: number;
  patientsWithoutFamily: number;
  professionalsWaitingAccess: number;
  leadsInPeriod: number;
  applicationsInPeriod: number;
  convertedLeadsInPeriod: number;
};

export type EntryPoint = {
  key: string;
  label: string;
  leads: number;
  applications: number;
};

export type OperationalPoint = {
  key: string;
  label: string;
  value: number;
};

type CreatedRecord = { created_at: string };

const OPEN_LEAD_STATUSES: Lead["status"][] = ["novo", "em_contato"];
const OPEN_APPLICATION_STATUSES: ProfessionalApplication["status"][] = ["novo", "em_analise"];

export function parseCreatedAt(value: string): number | null {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function getPeriodLabel(period: DashboardPeriod): string {
  return DASHBOARD_PERIODS.find((option) => option.value === period)?.label || "6 meses";
}

export function getPeriodStart(period: DashboardPeriod, now: Date): Date | null {
  if (period === "all") return null;

  const start = new Date(now);
  if (period === "7d") start.setUTCDate(start.getUTCDate() - 7);
  if (period === "1m") start.setUTCMonth(start.getUTCMonth() - 1);
  if (period === "6m") start.setUTCMonth(start.getUTCMonth() - 6);
  if (period === "1y") start.setUTCFullYear(start.getUTCFullYear() - 1);
  return start;
}

export function filterByPeriod<T extends CreatedRecord>(items: T[], period: DashboardPeriod, now: Date): T[] {
  const endTimestamp = now.getTime();
  if (Number.isNaN(endTimestamp)) return [];

  const start = getPeriodStart(period, now);
  const startTimestamp = start?.getTime() ?? Number.NEGATIVE_INFINITY;

  return items.filter((item) => {
    const timestamp = parseCreatedAt(item.created_at);
    return timestamp !== null && timestamp >= startTimestamp && timestamp <= endTimestamp;
  });
}

export function filterDashboardData(
  data: DashboardData,
  period: DashboardPeriod,
  now: Date,
): DashboardData {
  return {
    leads: filterByPeriod(data.leads, period, now),
    patients: filterByPeriod(data.patients, period, now),
    caregivers: filterByPeriod(data.caregivers, period, now),
    professionalApplications: filterByPeriod(data.professionalApplications, period, now),
  };
}

export function calculateConversionRate(leads: Pick<Lead, "status">[]): number {
  if (leads.length === 0) return 0;
  return (leads.filter((lead) => lead.status === "convertido").length / leads.length) * 100;
}

function currentOperationalMetrics(data: DashboardData) {
  return {
    openContacts: data.leads.filter((lead) => OPEN_LEAD_STATUSES.includes(lead.status)).length,
    openApplications: data.professionalApplications.filter((application) =>
      OPEN_APPLICATION_STATUSES.includes(application.status),
    ).length,
    activePatients: data.patients.filter((patient) => patient.status === "ativo").length,
    activeProfessionals: data.caregivers.filter((caregiver) => caregiver.account_status === "ativo").length,
    pendingPatients: data.patients.filter((patient) => patient.status === "pendente").length,
    patientsWithoutFamily: data.patients.filter((patient) => !patient.family_user_id).length,
    professionalsWaitingAccess: data.caregivers.filter(
      (caregiver) => caregiver.account_status === "aguardando_acesso",
    ).length,
  };
}

export function getDashboardMetrics(
  data: DashboardData,
  period: DashboardPeriod,
  now: Date,
): DashboardMetrics {
  const periodData = filterDashboardData(data, period, now);
  const operational = currentOperationalMetrics(data);

  return {
    ...operational,
    conversionRate: calculateConversionRate(periodData.leads),
    leadsInPeriod: periodData.leads.length,
    applicationsInPeriod: periodData.professionalApplications.length,
    convertedLeadsInPeriod: periodData.leads.filter((lead) => lead.status === "convertido").length,
  };
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcWeek(date: Date): Date {
  const day = date.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const start = startOfUtcDay(date);
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start;
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

type BucketUnit = "day" | "week" | "month";

function bucketUnitFor(period: DashboardPeriod): BucketUnit {
  if (period === "7d") return "day";
  if (period === "1m") return "week";
  return "month";
}

function bucketStartFor(date: Date, unit: BucketUnit): Date {
  if (unit === "day") return startOfUtcDay(date);
  if (unit === "week") return startOfUtcWeek(date);
  return startOfUtcMonth(date);
}

function advanceBucket(date: Date, unit: BucketUnit): Date {
  const next = new Date(date);
  if (unit === "day") next.setUTCDate(next.getUTCDate() + 1);
  if (unit === "week") next.setUTCDate(next.getUTCDate() + 7);
  if (unit === "month") next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

function bucketKey(date: Date, unit: BucketUnit): string {
  if (unit === "month") return date.toISOString().slice(0, 7);
  return date.toISOString().slice(0, 10);
}

function bucketLabel(date: Date, unit: BucketUnit): string {
  if (unit === "month") {
    return new Intl.DateTimeFormat("pt-BR", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    })
      .format(date)
      .replace(".", "");
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function earliestEntryTimestamp(data: DashboardData, endTimestamp: number): number | null {
  const timestamps = [...data.leads, ...data.professionalApplications]
    .map((item) => parseCreatedAt(item.created_at))
    .filter((timestamp): timestamp is number => timestamp !== null && timestamp <= endTimestamp);

  return timestamps.length > 0 ? Math.min(...timestamps) : null;
}

export function buildEntrySeries(
  data: DashboardData,
  period: DashboardPeriod,
  now: Date,
): EntryPoint[] {
  const endTimestamp = now.getTime();
  if (Number.isNaN(endTimestamp)) return [];

  const unit = bucketUnitFor(period);
  const periodLeads = filterByPeriod(data.leads, period, now);
  const periodApplications = filterByPeriod(data.professionalApplications, period, now);
  const hasValidEntry = [...periodLeads, ...periodApplications].some(
    (item) => parseCreatedAt(item.created_at) !== null,
  );
  if (!hasValidEntry) return [];

  const periodStart = getPeriodStart(period, now);
  const firstTimestamp = periodStart?.getTime() ?? earliestEntryTimestamp(data, endTimestamp);
  if (firstTimestamp === null || firstTimestamp === undefined) return [];

  const firstBucket = bucketStartFor(new Date(firstTimestamp), unit);
  const lastBucket = bucketStartFor(now, unit);
  const buckets = new Map<string, EntryPoint>();

  for (let cursor = firstBucket; cursor.getTime() <= lastBucket.getTime(); cursor = advanceBucket(cursor, unit)) {
    const key = bucketKey(cursor, unit);
    buckets.set(key, { key, label: bucketLabel(cursor, unit), leads: 0, applications: 0 });
  }

  for (const lead of periodLeads) {
    const timestamp = parseCreatedAt(lead.created_at);
    if (timestamp === null) continue;
    const bucket = buckets.get(bucketKey(bucketStartFor(new Date(timestamp), unit), unit));
    if (bucket) bucket.leads += 1;
  }

  for (const application of periodApplications) {
    const timestamp = parseCreatedAt(application.created_at);
    if (timestamp === null) continue;
    const bucket = buckets.get(bucketKey(bucketStartFor(new Date(timestamp), unit), unit));
    if (bucket) bucket.applications += 1;
  }

  return [...buckets.values()];
}

export function buildOperationalDistribution(data: DashboardData): OperationalPoint[] {
  const metrics = currentOperationalMetrics(data);
  return [
    { key: "active-patients", label: "Pacientes ativos", value: metrics.activePatients },
    { key: "pending-patients", label: "Pacientes pendentes", value: metrics.pendingPatients },
    { key: "without-family", label: "Sem família", value: metrics.patientsWithoutFamily },
    { key: "active-professionals", label: "Profissionais ativos", value: metrics.activeProfessionals },
    { key: "waiting-access", label: "Aguardando acesso", value: metrics.professionalsWaitingAccess },
  ];
}

export function sortByCreatedAtDescending<T extends CreatedRecord>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const leftTime = parseCreatedAt(left.created_at) ?? Number.NEGATIVE_INFINITY;
    const rightTime = parseCreatedAt(right.created_at) ?? Number.NEGATIVE_INFINITY;
    return rightTime - leftTime;
  });
}
