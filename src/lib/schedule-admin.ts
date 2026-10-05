import type { CaregiverScheduleEntry, CaregiverScheduleEntryInput } from "./data";
import {
  getCaregiverProfileByUserId,
  listAssignmentsForPatient,
  type Assignment,
} from "./data";
import {
  isScheduleDate,
  isScheduleTime,
  isValidScheduleTimeRange,
  scheduleIntervalsOverlap,
  shiftScheduleDate,
} from "./schedule-validation";
import { SCHEDULE_OVERLAP_CONFLICT_MESSAGE } from "./schedule-errors";
import { listCaregiverScheduleEntriesForProfessional } from "./data";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ScheduleMutation = {
  patient_id: string;
  caregiver_user_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  ends_next_day: boolean;
};

export function parseScheduleMutation(value: unknown): { data?: ScheduleMutation; error?: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: "Revise os dados da escala e tente novamente." };
  }
  const body = value as Record<string, unknown>;
  const patientId = typeof body.patient_id === "string" ? body.patient_id : "";
  const caregiverUserId = typeof body.caregiver_user_id === "string" ? body.caregiver_user_id : "";
  const scheduledDate = body.scheduled_date;
  const startTime = body.start_time;
  const endTime = body.end_time;
  const endsNextDay = body.ends_next_day;

  if (!UUID_PATTERN.test(patientId) || !UUID_PATTERN.test(caregiverUserId)) {
    return { error: "Selecione um paciente e um profissional válidos." };
  }
  if (!isScheduleDate(scheduledDate)) return { error: "Selecione uma data válida para a escala." };
  if (!isScheduleTime(startTime) || !isScheduleTime(endTime)) {
    return { error: "Informe horários válidos para o início e o fim do plantão." };
  }
  if (typeof endsNextDay !== "boolean") {
    return { error: "Informe se o plantão termina no dia seguinte." };
  }
  if (!isValidScheduleTimeRange(startTime, endTime, endsNextDay)) {
    return {
      error: endsNextDay
        ? "Para um plantão que termina no dia seguinte, o horário final deve ser igual ou anterior ao inicial."
        : "O horário final deve ser posterior ao horário inicial. Marque a opção de término no dia seguinte para plantões noturnos.",
    };
  }
  return {
    data: {
      patient_id: patientId,
      caregiver_user_id: caregiverUserId,
      scheduled_date: scheduledDate,
      start_time: startTime,
      end_time: endTime,
      ends_next_day: endsNextDay,
    },
  };
}

function assignmentCoversDate(assignment: Assignment, scheduledDate: string): boolean {
  return assignment.start_date <= scheduledDate && (!assignment.end_date || assignment.end_date >= scheduledDate);
}

export async function resolveScheduleMutation(
  mutation: ScheduleMutation,
  existing?: CaregiverScheduleEntry,
): Promise<{ data?: CaregiverScheduleEntryInput; error?: string; conflict?: boolean }> {
  const assignments = await listAssignmentsForPatient(mutation.patient_id);
  const assignment = assignments.find((candidate) =>
    candidate.caregiver_user_id === mutation.caregiver_user_id
      && assignmentCoversDate(candidate, mutation.scheduled_date)
      && (candidate.active === 1 || candidate.id === existing?.caregiver_assignment_id),
  );
  if (!assignment) {
    return { error: "Esse profissional não tem vínculo válido com o paciente na data selecionada." };
  }

  const caregiverProfile = await getCaregiverProfileByUserId(mutation.caregiver_user_id);
  const sameExistingAssignment = assignment.id === existing?.caregiver_assignment_id;
  if ((!caregiverProfile || caregiverProfile.account_status !== "ativo") && !sameExistingAssignment) {
    return { error: "Selecione um profissional com cadastro ativo e vínculo válido com o paciente." };
  }

  const conflictStart = shiftScheduleDate(mutation.scheduled_date, -1);
  const conflictEnd = shiftScheduleDate(mutation.scheduled_date, 2);
  if (!conflictStart || !conflictEnd) return { error: "Selecione uma data válida para a escala." };
  const professionalSchedules = await listCaregiverScheduleEntriesForProfessional(
    mutation.caregiver_user_id,
    conflictStart,
    conflictEnd,
  );
  const newSchedule = {
    scheduled_date: mutation.scheduled_date,
    start_time: mutation.start_time,
    end_time: mutation.end_time,
    ends_next_day: mutation.ends_next_day,
  };
  if (professionalSchedules.some((schedule) =>
    schedule.id !== existing?.id && scheduleIntervalsOverlap(newSchedule, schedule),
  )) {
    return { error: SCHEDULE_OVERLAP_CONFLICT_MESSAGE, conflict: true };
  }

  return {
    data: {
      caregiver_assignment_id: assignment.id,
      scheduled_date: mutation.scheduled_date,
      start_time: mutation.start_time,
      end_time: mutation.end_time,
      ends_next_day: mutation.ends_next_day,
      profession: caregiverProfile?.profession || existing?.profession || "cuidador",
    },
  };
}
