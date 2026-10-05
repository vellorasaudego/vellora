export const SCHEDULE_HISTORY_CONFLICT_MESSAGE =
  "Este cadastro possui escalas registradas. Por segurança, o histórico impede a exclusão do profissional ou paciente.";

export class ScheduleHistoryConflictError extends Error {
  constructor(message = SCHEDULE_HISTORY_CONFLICT_MESSAGE) {
    super(message);
    this.name = "ScheduleHistoryConflictError";
  }
}

export const SCHEDULE_OVERLAP_CONFLICT_MESSAGE =
  "Este profissional já possui outro plantão nesse intervalo. Ajuste os horários antes de salvar.";

export class ScheduleOverlapConflictError extends Error {
  constructor(message = SCHEDULE_OVERLAP_CONFLICT_MESSAGE) {
    super(message);
    this.name = "ScheduleOverlapConflictError";
  }
}

export function isScheduleOverlapConflictError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (error instanceof ScheduleOverlapConflictError) return true;
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return code === "23P01" || message.includes("SCHEDULE_OVERLAP_CONFLICT");
}
