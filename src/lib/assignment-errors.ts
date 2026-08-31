export const ASSIGNMENT_ACTIVE_CONFLICT_MESSAGE =
  "Este cuidador já possui um vínculo ativo com este paciente.";

export const ASSIGNMENT_DUPLICATE_CONFLICT_MESSAGE =
  "Já existe um vínculo para este cuidador, paciente e data.";

export const ASSIGNMENT_HISTORY_CONFLICT_MESSAGE =
  "Existem vínculos históricos duplicados para este cuidador, paciente e data. Corrija os registros antes de reativar.";

export type AssignmentConflictCode =
  | "active_duplicate"
  | "duplicate_assignment"
  | "duplicate_history";

export class AssignmentConflictError extends Error {
  readonly code: AssignmentConflictCode;

  constructor(code: AssignmentConflictCode, message: string) {
    super(message);
    this.name = "AssignmentConflictError";
    this.code = code;
  }
}

export function isAssignmentUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const message =
    "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : "";

  return (
    code === "23505" ||
    message.includes("caregiver_assignments_patient_caregiver_start_key") ||
    (message.includes("unique") && message.includes("caregiver_assignments"))
  );
}
