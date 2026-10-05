export const PROFESSION_LABELS = {
  cuidador: "Cuidador(a)",
  tecnico_enfermagem: "Técnico(a) de enfermagem",
  enfermeiro: "Enfermeiro(a)",
  outros: "Outro profissional",
} as const;

export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

export function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function dateFromKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function monthDays(value: string) {
  const [year, month] = value.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const gridStart = new Date(year, month - 1, 1 - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    return { date, key: dateKey(date), inMonth: date.getMonth() === month - 1 };
  });
}

export function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  const formatted = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  return formatted.charAt(0).toLocaleUpperCase("pt-BR") + formatted.slice(1);
}

export function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(dateFromKey(value));
}

export function formatTime(value: string) {
  return value.slice(0, 5);
}

export function timeToMinutes(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatShiftTime(entry: { start_time: string; end_time: string; ends_next_day: boolean }) {
  return `${formatTime(entry.start_time)}–${formatTime(entry.end_time)}${entry.ends_next_day ? " (dia seguinte)" : ""}`;
}
