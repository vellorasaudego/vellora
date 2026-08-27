export const dailyRecordFixture = {
  patient_id: "patient-001",
  caregiver_user_id: "caregiver-001",
  record_date: "2026-08-26",
  record_time: "09:30",
  bp_systolic: 128,
  bp_diastolic: 82,
  heart_rate: 76,
  temperature: 36.6,
  spo2: 97,
  glucose: 110,
  medications: "Medicação de rotina",
  feeding: "Boa aceitação",
  hygiene: "Banho realizado",
  mobility: "Caminhada assistida",
  mood: "bem",
  pain_level: 0,
  notes: "Sem observações adicionais",
  incident: 0,
  incident_description: null,
  photo_data: null,
} as const;

export function dailyRecordForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    patient_id: dailyRecordFixture.patient_id,
    record_date: dailyRecordFixture.record_date,
    record_time: dailyRecordFixture.record_time,
    mood: dailyRecordFixture.mood,
    ...overrides,
  })) {
    form.set(key, value);
  }
  return form;
}
