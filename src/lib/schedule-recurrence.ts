import { isScheduleDate } from "./schedule-validation";

export const MAX_RECURRENCE_DAYS = 366;

export const SCHEDULE_RECURRENCE_PATTERNS = [
  "daily",
  "alternate_days",
  "weekdays",
  "weekends",
  "selected_weekdays",
  "every_n_days",
  "monthly",
  "custom_dates",
] as const;

export type ScheduleRecurrencePattern = (typeof SCHEDULE_RECURRENCE_PATTERNS)[number];

export type ScheduleRecurrenceInput = {
  start_date: string;
  end_date: string;
  pattern: ScheduleRecurrencePattern;
  interval_days?: number;
  weekdays?: number[];
  dates?: string[];
  skip_dates?: string[];
};

export type ScheduleRecurrenceResult = { dates: string[] } | { error: string };

function parseDateList(value: unknown, field: string): string[] | { error: string } {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_RECURRENCE_DAYS) {
    return { error: `Revise a lista de ${field.toLocaleLowerCase("pt-BR")} e tente novamente.` };
  }
  const dates: string[] = [];
  for (const date of value) {
    if (!isScheduleDate(date)) return { error: `Informe datas válidas em ${field.toLocaleLowerCase("pt-BR")}.` };
    if (dates.includes(date)) return { error: `Remova datas repetidas em ${field.toLocaleLowerCase("pt-BR")}.` };
    dates.push(date);
  }
  return dates;
}

function weekdayOf(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return utcDate(year, month - 1, day).getUTCDay();
}

function daysInMonth(year: number, month: number): number {
  return utcDate(year, month, 0).getUTCDate();
}

function utcDate(year: number, monthIndex: number, day: number): Date {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, monthIndex, day);
  return date;
}

function addDays(startDate: string, offset: number): string {
  const [year, month, day] = startDate.split("-").map(Number);
  const date = utcDate(year, month - 1, day + offset);
  return date.toISOString().slice(0, 10);
}

export function generateScheduleRecurrence(value: unknown): ScheduleRecurrenceResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: "Revise os dados da recorrência e tente novamente." };
  }

  const input = value as Record<string, unknown>;
  const startDate = input.start_date;
  const endDate = input.end_date;
  const pattern = input.pattern;
  if (!isScheduleDate(startDate) || !isScheduleDate(endDate) || startDate > endDate) {
    return { error: "Informe um período válido para a recorrência." };
  }
  if (!SCHEDULE_RECURRENCE_PATTERNS.includes(pattern as ScheduleRecurrencePattern)) {
    return { error: "Selecione um padrão de recorrência válido." };
  }

  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  const totalDays = Math.floor((utcDate(endYear, endMonth - 1, endDay).getTime() - utcDate(startYear, startMonth - 1, startDay).getTime()) / 86_400_000) + 1;
  if (totalDays > MAX_RECURRENCE_DAYS) {
    return { error: "O período da recorrência não pode ultrapassar 366 dias." };
  }

  const skipDates = parseDateList(input.skip_dates, "Datas para pular");
  if (!Array.isArray(skipDates)) return skipDates;
  if (skipDates.some((date) => date < startDate || date > endDate)) {
    return { error: "As datas para pular devem estar dentro do período da recorrência." };
  }

  let customDates: string[] = [];
  if (pattern === "custom_dates") {
    const parsedCustomDates = parseDateList(input.dates, "Datas avulsas");
    if (!Array.isArray(parsedCustomDates)) return parsedCustomDates;
    customDates = parsedCustomDates;
  }

  const weekdaysValue = input.weekdays;
  let weekdays: number[] = [];
  if (weekdaysValue !== undefined) {
    if (!Array.isArray(weekdaysValue) || weekdaysValue.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
      return { error: "Selecione dias da semana válidos." };
    }
    weekdays = [...new Set(weekdaysValue as number[])];
  }

  let intervalDays = 0;
  if (pattern === "every_n_days") {
    intervalDays = input.interval_days as number;
    if (!Number.isInteger(intervalDays) || intervalDays < 1 || intervalDays > MAX_RECURRENCE_DAYS) {
      return { error: "Informe um intervalo entre 1 e 366 dias." };
    }
  }
  if (pattern === "selected_weekdays" && weekdays.length === 0) {
    return { error: "Selecione pelo menos um dia da semana." };
  }
  if (pattern === "custom_dates" && customDates.length === 0) {
    return { error: "Adicione pelo menos uma data avulsa." };
  }
  if (pattern === "custom_dates" && customDates.some((date) => date < startDate || date > endDate)) {
    return { error: "As datas avulsas devem estar dentro do período selecionado." };
  }

  const candidates: string[] = [];
  if (pattern === "custom_dates") {
    candidates.push(...customDates);
  } else if (pattern === "monthly") {
    const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
    const [endYear, endMonth] = endDate.split("-").map(Number);
    for (let monthIndex = startYear * 12 + startMonth - 1; monthIndex <= endYear * 12 + endMonth - 1; monthIndex += 1) {
      const year = Math.floor(monthIndex / 12);
      const month = monthIndex % 12 + 1;
      const day = Math.min(startDay, daysInMonth(year, month));
      const candidate = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (candidate >= startDate && candidate <= endDate) candidates.push(candidate);
    }
  } else {
    for (let offset = 0; offset < totalDays; offset += 1) {
      const date = addDays(startDate, offset);
      const weekday = weekdayOf(date);
      const matches = pattern === "daily"
        || (pattern === "alternate_days" && offset % 2 === 0)
        || (pattern === "weekdays" && weekday >= 1 && weekday <= 5)
        || (pattern === "weekends" && (weekday === 0 || weekday === 6))
        || (pattern === "selected_weekdays" && weekdays.includes(weekday))
        || (pattern === "every_n_days" && offset % intervalDays === 0);
      if (matches) candidates.push(date);
    }
  }

  const skipped = new Set(skipDates);
  const dates = [...new Set(candidates)].filter((date) => !skipped.has(date)).sort();
  if (dates.length === 0) return { error: "Esse padrão não gera plantões no período selecionado." };
  return { dates };
}
