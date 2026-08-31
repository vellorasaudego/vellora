export const DAYTIME_CARE_PLAN = "Período diurno 12h/dia";
export const NIGHTTIME_CARE_PLAN = "Período noturno 12h/dia";
export const FULL_DAY_CARE_PLAN = "24 horas";
export const CUSTOM_CARE_PLAN_LABEL = "Personalizado";

export const CUSTOM_CARE_PLAN_OPTION = "__custom__";
export const LEGACY_CARE_PLAN_OPTION = "__legacy__";

export const STANDARD_CARE_PLAN_VALUES = [DAYTIME_CARE_PLAN, NIGHTTIME_CARE_PLAN, FULL_DAY_CARE_PLAN] as const;

export const CARE_PLAN_OPTIONS = [
  { value: DAYTIME_CARE_PLAN, label: DAYTIME_CARE_PLAN },
  { value: NIGHTTIME_CARE_PLAN, label: NIGHTTIME_CARE_PLAN },
  { value: FULL_DAY_CARE_PLAN, label: FULL_DAY_CARE_PLAN },
  { value: CUSTOM_CARE_PLAN_OPTION, label: CUSTOM_CARE_PLAN_LABEL },
] as const;

export type StandardCarePlanValue = (typeof STANDARD_CARE_PLAN_VALUES)[number];
export type CarePlanSelection = StandardCarePlanValue | typeof CUSTOM_CARE_PLAN_OPTION | typeof LEGACY_CARE_PLAN_OPTION;

export type CustomCarePlanSchedule = {
  start: string;
  end: string;
};

export type ParsedCarePlanValue =
  | { kind: "empty"; value: null }
  | { kind: "standard"; value: StandardCarePlanValue }
  | { kind: "custom"; value: string; schedule: CustomCarePlanSchedule }
  | { kind: "legacy"; value: string };

export type CustomCarePlanValidation =
  | { valid: true; durationMinutes: number }
  | { valid: false; message: string; focus: "start" | "end" | "both" };

const MINUTES_PER_DAY = 24 * 60;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;
const CUSTOM_CARE_PLAN_PATTERN = /^Personalizado\s*\(\s*((?:[01]\d|2[0-3]):[0-5]\d)\s*(?:–|-|às)\s*((?:[01]\d|2[0-3]):[0-5]\d)\s*\)$/u;

export function isStandardCarePlan(value: string | null | undefined): value is StandardCarePlanValue {
  return STANDARD_CARE_PLAN_VALUES.some((plan) => plan === value);
}

export function timeToMinutes(value: string): number | null {
  const match = TIME_PATTERN.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

export function calculateCustomDuration(start: string, end: string): number | null {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) return null;

  const duration = endMinutes - startMinutes;
  return duration > 0 ? duration : duration + MINUTES_PER_DAY;
}

export function validateCustomCarePlanSchedule(start: string, end: string): CustomCarePlanValidation {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  if (!start && !end) {
    return { valid: false, message: "Informe a hora de início e a hora de fim.", focus: "both" };
  }
  if (startMinutes === null) {
    return { valid: false, message: "Informe uma hora de início válida, entre 00:00 e 23:59.", focus: "start" };
  }
  if (endMinutes === null) {
    return { valid: false, message: "Informe uma hora de fim válida, entre 00:00 e 23:59.", focus: "end" };
  }
  if (startMinutes === endMinutes) {
    return { valid: false, message: "A hora de fim deve ser diferente da hora de início.", focus: "both" };
  }

  const duration = endMinutes - startMinutes;
  return { valid: true, durationMinutes: duration > 0 ? duration : duration + MINUTES_PER_DAY };
}

export function formatDuration(durationMinutes: number): string {
  if (!Number.isInteger(durationMinutes) || durationMinutes < 0) {
    throw new RangeError("A duração deve ser um número inteiro de minutos não negativo.");
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const parts: string[] = [];

  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hora" : "horas"}`);
  if (minutes > 0 || hours === 0) parts.push(`${minutes} ${minutes === 1 ? "minuto" : "minutos"}`);

  return parts.join(" e ");
}

export function serializeCustomCarePlan(schedule: CustomCarePlanSchedule): string | null {
  if (!validateCustomCarePlanSchedule(schedule.start, schedule.end).valid) return null;
  return `${CUSTOM_CARE_PLAN_LABEL} (${schedule.start}–${schedule.end})`;
}

export function parseCarePlanValue(value: string | null | undefined): ParsedCarePlanValue {
  if (value === null || value === undefined || value.trim() === "") return { kind: "empty", value: null };

  const trimmedValue = value.trim();
  if (isStandardCarePlan(trimmedValue)) return { kind: "standard", value: trimmedValue };

  const customMatch = CUSTOM_CARE_PLAN_PATTERN.exec(trimmedValue);
  if (customMatch) {
    const schedule = { start: customMatch[1], end: customMatch[2] };
    if (validateCustomCarePlanSchedule(schedule.start, schedule.end).valid) {
      return { kind: "custom", value, schedule };
    }
  }

  return { kind: "legacy", value };
}

export type CarePlanInitialState = {
  selection: CarePlanSelection;
  storedValue: string;
  customSchedule: CustomCarePlanSchedule | null;
  legacyValue: string | null;
};

export function resolveCarePlanInitialState(value: string | null | undefined, preserveLegacy: boolean): CarePlanInitialState {
  const parsed = parseCarePlanValue(value);

  if (parsed.kind === "custom") {
    return { selection: CUSTOM_CARE_PLAN_OPTION, storedValue: parsed.value, customSchedule: parsed.schedule, legacyValue: null };
  }
  if (parsed.kind === "standard") {
    return { selection: parsed.value, storedValue: parsed.value, customSchedule: null, legacyValue: null };
  }
  if (parsed.kind === "legacy" && preserveLegacy) {
    return { selection: LEGACY_CARE_PLAN_OPTION, storedValue: parsed.value, customSchedule: null, legacyValue: parsed.value };
  }

  return { selection: DAYTIME_CARE_PLAN, storedValue: DAYTIME_CARE_PLAN, customSchedule: null, legacyValue: null };
}
