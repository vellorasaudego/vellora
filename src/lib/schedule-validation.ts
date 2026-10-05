import type { ProfessionalApplication } from "./data";

export const SCHEDULE_PROFESSIONS: ProfessionalApplication["profession"][] = [
  "cuidador",
  "tecnico_enfermagem",
  "enfermeiro",
  "outros",
];

export type ScheduleMonth = {
  start: string;
  endExclusive: string;
  lastDay: string;
};

export function parseScheduleMonth(value: string | null | undefined): ScheduleMonth | null {
  if (!value || !/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  const start = `${value}-01`;
  const nextMonth = new Date(Date.UTC(year, month, 1));
  const endExclusive = nextMonth.toISOString().slice(0, 10);
  const lastDay = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start, endExclusive, lastDay };
}

export function isScheduleDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isScheduleTime(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isScheduleProfession(value: unknown): value is ProfessionalApplication["profession"] {
  return typeof value === "string" && SCHEDULE_PROFESSIONS.includes(value as ProfessionalApplication["profession"]);
}

export function isValidScheduleTimeRange(
  startTime: string,
  endTime: string,
  endsNextDay: boolean,
): boolean {
  return endsNextDay ? endTime <= startTime : endTime > startTime;
}

type ScheduleIntervalInput = {
  scheduled_date: string;
  start_time: string;
  end_time: string;
  ends_next_day: boolean;
};

function minutesFromTime(value: string): number | null {
  const shortTime = value.slice(0, 5);
  if (!isScheduleTime(shortTime)) return null;
  const [hours, minutes] = shortTime.split(":").map(Number);
  return hours * 60 + minutes;
}

export function scheduleInterval(entry: ScheduleIntervalInput): { start: number; end: number } | null {
  if (!isScheduleDate(entry.scheduled_date)) return null;
  const startMinutes = minutesFromTime(entry.start_time);
  const endMinutes = minutesFromTime(entry.end_time);
  if (startMinutes === null || endMinutes === null) return null;

  const [year, month, day] = entry.scheduled_date.split("-").map(Number);
  const dayStart = Date.UTC(year, month - 1, day) / 60_000;
  return {
    start: dayStart + startMinutes,
    end: dayStart + (entry.ends_next_day ? 1440 : 0) + endMinutes,
  };
}

export function scheduleIntervalsOverlap(first: ScheduleIntervalInput, second: ScheduleIntervalInput): boolean {
  const firstInterval = scheduleInterval(first);
  const secondInterval = scheduleInterval(second);
  return Boolean(
    firstInterval
      && secondInterval
      && firstInterval.start < secondInterval.end
      && secondInterval.start < firstInterval.end,
  );
}

export function shiftScheduleDate(value: string, days: number): string | null {
  if (!isScheduleDate(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
