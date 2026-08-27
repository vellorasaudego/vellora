export const DAILY_RECORD_AUDIT_FIELDS = [
  "record_date",
  "record_time",
  "bp_systolic",
  "bp_diastolic",
  "heart_rate",
  "temperature",
  "spo2",
  "glucose",
  "medications",
  "feeding",
  "hygiene",
  "mobility",
  "mood",
  "pain_level",
  "notes",
  "incident",
  "incident_description",
  "photo_data",
] as const;

export type DailyRecordAuditField = (typeof DAILY_RECORD_AUDIT_FIELDS)[number];

export const DAILY_RECORD_FIELD_LABELS: Record<DailyRecordAuditField, string> = {
  record_date: "data da medição",
  record_time: "horário da medição",
  bp_systolic: "pressão sistólica",
  bp_diastolic: "pressão diastólica",
  heart_rate: "frequência cardíaca",
  temperature: "temperatura",
  spo2: "saturação de oxigênio",
  glucose: "glicemia",
  medications: "medicação",
  feeding: "alimentação",
  hygiene: "higiene",
  mobility: "mobilidade e atividades",
  mood: "humor",
  pain_level: "nível de dor",
  notes: "observações",
  incident: "intercorrência",
  incident_description: "descrição da intercorrência",
  photo_data: "foto",
};

type RecordLike = Partial<Record<DailyRecordAuditField, unknown>>;

/**
 * Creates a compact audit snapshot. The photo itself is intentionally omitted;
 * only its presence is recorded so an edit does not duplicate sensitive bytes.
 */
export function snapshotDailyRecord(record: RecordLike): Record<DailyRecordAuditField, unknown> {
  const snapshot = {} as Record<DailyRecordAuditField, unknown>;
  for (const field of DAILY_RECORD_AUDIT_FIELDS) {
    snapshot[field] = field === "photo_data" ? Boolean(record[field]) : record[field] ?? null;
  }
  return snapshot;
}

export function diffDailyRecord(before: RecordLike, after: RecordLike): DailyRecordAuditField[] {
  const beforeSnapshot = snapshotDailyRecord(before);
  const afterSnapshot = snapshotDailyRecord(after);
  return DAILY_RECORD_AUDIT_FIELDS.filter(
    (field) => JSON.stringify(beforeSnapshot[field]) !== JSON.stringify(afterSnapshot[field])
  );
}

export function saoPauloDateTime(date = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}
