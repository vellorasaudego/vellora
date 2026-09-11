import { describe, expect, it } from "vitest";
import {
  buildEntrySeries,
  buildOperationalDistribution,
  calculateConversionRate,
  filterByPeriod,
  getDashboardMetrics,
  getPeriodStart,
  type DashboardData,
} from "../src/app/admin/dashboard-utils";

const now = new Date("2026-09-10T12:00:00.000Z");

function lead(id: string, created_at: string, status: "novo" | "em_contato" | "convertido" | "recusado") {
  return {
    id,
    name: id,
    email: `${id}@example.com`,
    phone: "62999999999",
    patient_name: null,
    care_type: null,
    message: null,
    status,
    created_at,
  } as DashboardData["leads"][number];
}

function application(id: string, created_at: string, status: "novo" | "em_analise" | "aprovado" | "recusado") {
  return {
    id,
    name: id,
    email: `${id}@example.com`,
    phone: "62999999999",
    city: null,
    profession: "cuidador",
    coren: null,
    experience: null,
    availability_days: [],
    availability_shifts: [],
    available_from: null,
    notes: null,
    status,
    lgpd_consent: true,
    lgpd_consent_at: null,
    privacy_notice_version: "2026-08-21",
    reviewed_at: null,
    reviewed_by: null,
    created_at,
  } as DashboardData["professionalApplications"][number];
}

const emptyData: DashboardData = {
  leads: [],
  patients: [],
  caregivers: [],
  professionalApplications: [],
};

describe("agregações do dashboard administrativo", () => {
  it("calcula a taxa de conversão sem divisão por zero", () => {
    expect(calculateConversionRate([])).toBe(0);
    expect(calculateConversionRate([
      { status: "convertido" },
      { status: "novo" },
      { status: "recusado" },
      { status: "convertido" },
    ])).toBe(50);
  });

  it("separa filas abertas dos estados encerrados e conta a operação atual", () => {
    const data: DashboardData = {
      leads: [lead("novo", "2026-09-09T10:00:00.000Z", "novo"), lead("convertido", "2026-09-08T10:00:00.000Z", "convertido")],
      professionalApplications: [application("analise", "2026-09-09T10:00:00.000Z", "em_analise"), application("aprovada", "2026-09-08T10:00:00.000Z", "aprovado")],
      patients: [
        { id: "active", name: "Ativo", birth_date: null, address: null, care_level: null, condition_summary: null, family_user_id: "family", status: "ativo", notes: null, created_at: "2026-09-01T10:00:00.000Z" },
        { id: "pending", name: "Pendente", birth_date: null, address: null, care_level: null, condition_summary: null, family_user_id: null, status: "pendente", notes: null, created_at: "2026-09-01T10:00:00.000Z" },
      ],
      caregivers: [
        { id: "active", application_id: null, user_id: "user", name: "Ativo", contact_email: "ativo@example.com", access_email: "ativo@example.com", phone: "62999999999", city: null, profession: "cuidador", coren: null, experience: null, availability_days: [], availability_shifts: [], available_from: null, notes: null, account_status: "ativo", approved_at: "2026-09-01T10:00:00.000Z", created_at: "2026-09-01T10:00:00.000Z" },
        { id: "waiting", application_id: null, user_id: null, name: "Aguardando", contact_email: "aguardando@example.com", access_email: null, phone: "62999999999", city: null, profession: "cuidador", coren: null, experience: null, availability_days: [], availability_shifts: [], available_from: null, notes: null, account_status: "aguardando_acesso", approved_at: "2026-09-01T10:00:00.000Z", created_at: "2026-09-01T10:00:00.000Z" },
      ],
    };

    expect(getDashboardMetrics(data, "6m", now)).toMatchObject({
      openContacts: 1,
      openApplications: 1,
      activePatients: 1,
      activeProfessionals: 1,
      pendingPatients: 1,
      patientsWithoutFamily: 1,
      professionalsWaitingAccess: 1,
      conversionRate: 50,
    });
  });

  it("monta a distribuição operacional com os indicadores acionáveis", () => {
    const data: DashboardData = {
      ...emptyData,
      patients: [
        { id: "1", name: "A", birth_date: null, address: null, care_level: null, condition_summary: null, family_user_id: null, status: "pendente", notes: null, created_at: "2026-09-01T10:00:00.000Z" },
      ],
    };

    expect(buildOperationalDistribution(data)).toEqual([
      { key: "active-patients", label: "Pacientes ativos", value: 0 },
      { key: "pending-patients", label: "Pacientes pendentes", value: 1 },
      { key: "without-family", label: "Sem família", value: 1 },
      { key: "active-professionals", label: "Profissionais ativos", value: 0 },
      { key: "waiting-access", label: "Aguardando acesso", value: 0 },
    ]);
  });
});

describe("filtros e série temporal do dashboard", () => {
  it("usa 6 meses como janela calendário e não compartilha a data recebida", () => {
    const start = getPeriodStart("6m", now);
    expect(start?.toISOString()).toBe("2026-03-10T12:00:00.000Z");
    expect(now.toISOString()).toBe("2026-09-10T12:00:00.000Z");
  });

  it.each([
    ["7d", "2026-09-03T12:00:00.000Z", 1],
    ["1m", "2026-08-10T12:00:00.000Z", 1],
    ["6m", "2026-03-10T12:00:00.000Z", 1],
    ["1y", "2025-09-10T12:00:00.000Z", 1],
    ["all", "2020-01-01T00:00:00.000Z", 2],
  ] as const)("filtra o período %s sem mutar os dados", (period, includedDate, expected) => {
    const records = [
      { id: "included", created_at: includedDate },
      { id: "excluded", created_at: "2019-01-01T00:00:00.000Z" },
    ];
    const filtered = filterByPeriod(records, period, now);
    expect(filtered).toHaveLength(expected);
    expect(records).toHaveLength(2);
  });

  it("agrega leads e candidaturas em buckets comparáveis e inclui zeros", () => {
    const data: DashboardData = {
      ...emptyData,
      leads: [
        lead("lead-1", "2026-09-09T10:00:00.000Z", "novo"),
        lead("lead-2", "2026-09-04T10:00:00.000Z", "convertido"),
        lead("outside", "2026-08-01T10:00:00.000Z", "novo"),
      ],
      professionalApplications: [application("application-1", "2026-09-09T11:00:00.000Z", "novo")],
    };

    const series = buildEntrySeries(data, "7d", now);
    expect(series).toHaveLength(8);
    expect(series.reduce((total, point) => total + point.leads, 0)).toBe(2);
    expect(series.reduce((total, point) => total + point.applications, 0)).toBe(1);
    expect(series.some((point) => point.leads === 0 && point.applications === 0)).toBe(true);
  });

  it("retorna série vazia quando não há entradas válidas", () => {
    expect(buildEntrySeries(emptyData, "6m", now)).toEqual([]);
  });
});
