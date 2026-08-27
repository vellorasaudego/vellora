import { executeBatch, query, queryOne } from "./db";
import { randomUUID } from "crypto";
import { hashPassword } from "./auth";
import {
  deleteStoredFile,
  deleteStoredFiles,
  getStoredFile,
  putStoredFile,
} from "./storage";
import { diffDailyRecord, snapshotDailyRecord } from "./record-utils";
import * as supabaseData from "./supabase/data";
import { resolveAuthProvider } from "./auth-provider";
import { runtimeValue } from "./runtime-config";

export type User = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: "admin" | "familia" | "cuidador";
  phone: string | null;
  session_version: number;
  deleted_at: string | null;
  created_at: string;
};

export type Patient = {
  id: string;
  name: string;
  birth_date: string | null;
  address: string | null;
  care_level: string | null;
  condition_summary: string | null;
  family_user_id: string | null;
  status: "pendente" | "ativo" | "inativo";
  notes: string | null;
  created_at: string;
};

export type Assignment = {
  id: string;
  patient_id: string;
  caregiver_user_id: string;
  start_date: string;
  end_date: string | null;
  active: number;
  created_at: string;
};

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  patient_name: string | null;
  care_type: string | null;
  message: string | null;
  status: "novo" | "em_contato" | "convertido" | "recusado";
  created_at: string;
};

export type ProfessionalApplication = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string | null;
  profession: "cuidador" | "tecnico_enfermagem" | "enfermeiro" | "outros";
  coren: string | null;
  experience: string | null;
  availability_days: string[];
  availability_shifts: string[];
  available_from: string | null;
  notes: string | null;
  status: "novo" | "em_analise" | "aprovado" | "recusado";
  lgpd_consent: boolean;
  lgpd_consent_at: string | null;
  privacy_notice_version: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
};

export type CaregiverProfile = {
  id: string;
  application_id: string | null;
  user_id: string | null;
  name: string;
  contact_email: string;
  access_email: string | null;
  phone: string;
  city: string | null;
  profession: ProfessionalApplication["profession"];
  coren: string | null;
  experience: string | null;
  availability_days: string[];
  availability_shifts: string[];
  available_from: string | null;
  notes: string | null;
  account_status: "aguardando_acesso" | "ativo" | "inativo";
  approved_at: string;
  created_at: string;
};

export type ContractDocument = {
  id: string;
  family_user_id: string | null;
  caregiver_profile_id: string | null;
  caregiver_user_id: string | null;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string | null;
  created_at: string;
};

type StoredContractDocument = ContractDocument & { storage_key: string };

export type DailyRecord = {
  id: string;
  patient_id: string;
  caregiver_user_id: string;
  record_date: string;
  record_time: string | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  heart_rate: number | null;
  temperature: number | null;
  spo2: number | null;
  glucose: number | null;
  medications: string | null;
  feeding: string | null;
  hygiene: string | null;
  mobility: string | null;
  mood: string | null;
  pain_level: number | null;
  notes: string | null;
  incident: number;
  incident_description: string | null;
  photo_data: string | null;
  created_at: string;
  updated_at: string;
};

export type DailyRecordAuditEvent = {
  id: string;
  record_id: string;
  patient_id: string;
  actor_user_id: string | null;
  actor_name: string;
  action: "created" | "updated";
  changed_fields: string[];
  before_data: string | null;
  after_data: string | null;
  created_at: string;
};

export type RecordAuditActor = {
  userId: string;
  name: string;
};

// ---------- Users ----------
function shouldUseSupabaseData(): boolean {
  const provider = supabaseData.getDataProvider();
  if (
    resolveAuthProvider(runtimeValue("VELLORA_AUTH_PROVIDER")) === "supabase" &&
    provider !== "supabase"
  ) {
    throw new supabaseData.SupabaseDataError(
      "VELLORA_AUTH_PROVIDER=supabase exige VELLORA_DATA_PROVIDER=supabase para evitar misturar dados D1 e Supabase.",
    );
  }
  return provider === "supabase";
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  if (shouldUseSupabaseData()) return supabaseData.getUserByEmail(email);
  return queryOne<User>("SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL", [email]);
}

export async function getUserById(id: string): Promise<User | undefined> {
  if (shouldUseSupabaseData()) return supabaseData.getUserById(id);
  return queryOne<User>("SELECT * FROM users WHERE id = $1", [id]);
}

export async function getUsersByIds(ids: string[]): Promise<User[]> {
  if (shouldUseSupabaseData()) return supabaseData.getUsersByIds(ids);
  if (ids.length === 0) return [];
  const placeholders = ids.map((_, index) => `$${index + 1}`).join(",");
  return query<User>(`SELECT * FROM users WHERE id IN (${placeholders})`, ids);
}

export async function listUsersByRole(role: string): Promise<User[]> {
  if (shouldUseSupabaseData()) return supabaseData.listUsersByRole(role);
  return query<User>("SELECT * FROM users WHERE role = $1 AND deleted_at IS NULL ORDER BY name", [role]);
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: "admin" | "familia" | "cuidador";
  phone?: string;
}): Promise<User> {
  if (shouldUseSupabaseData()) return supabaseData.createUser(input);
  const id = randomUUID();
  await query(
    "INSERT INTO users (id, name, email, password_hash, role, phone) VALUES ($1,$2,$3,$4,$5,$6)",
    [id, input.name, input.email.toLowerCase().trim(), hashPassword(input.password), input.role, input.phone || null]
  );
  return (await getUserById(id))!;
}

// ---------- Patients ----------
export async function listPatients(): Promise<Patient[]> {
  if (shouldUseSupabaseData()) return supabaseData.listPatients();
  return query<Patient>("SELECT * FROM patients ORDER BY created_at DESC");
}

export async function getPatient(id: string): Promise<Patient | undefined> {
  if (shouldUseSupabaseData()) return supabaseData.getPatient(id);
  return queryOne<Patient>("SELECT * FROM patients WHERE id = $1", [id]);
}

export async function listPatientsByFamily(familyUserId: string): Promise<Patient[]> {
  if (shouldUseSupabaseData()) return supabaseData.listPatientsByFamily(familyUserId);
  return query<Patient>("SELECT * FROM patients WHERE family_user_id = $1 ORDER BY created_at DESC", [familyUserId]);
}

export async function listPatientsByCaregiver(caregiverUserId: string): Promise<Patient[]> {
  if (shouldUseSupabaseData()) return supabaseData.listPatientsByCaregiver(caregiverUserId);
  return query<Patient>(
    `SELECT p.* FROM patients p
     JOIN caregiver_assignments a ON a.patient_id = p.id
     WHERE a.caregiver_user_id = $1 AND a.active = 1
     ORDER BY p.name`,
    [caregiverUserId]
  );
}

export async function createPatient(input: {
  name: string;
  birth_date?: string;
  address?: string;
  care_level?: string;
  condition_summary?: string;
  family_user_id?: string | null;
  status?: "pendente" | "ativo" | "inativo";
  notes?: string;
}): Promise<Patient> {
  if (shouldUseSupabaseData()) return supabaseData.createPatient(input);
  const id = randomUUID();
  await query(
    `INSERT INTO patients (id, name, birth_date, address, care_level, condition_summary, family_user_id, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      id,
      input.name,
      input.birth_date || null,
      input.address || null,
      input.care_level || null,
      input.condition_summary || null,
      input.family_user_id || null,
      input.status || "pendente",
      input.notes || null,
    ]
  );
  return (await getPatient(id))!;
}

export async function updatePatient(id: string, fields: Partial<Patient>): Promise<void> {
  if (shouldUseSupabaseData()) return supabaseData.updatePatient(id, fields);
  const allowed: (keyof Patient)[] = [
    "name",
    "birth_date",
    "address",
    "care_level",
    "condition_summary",
    "family_user_id",
    "status",
    "notes",
  ];
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const key of allowed) {
    if (key in fields) {
      sets.push(`${key} = $${i}`);
      values.push(fields[key]);
      i++;
    }
  }
  if (sets.length === 0) return;
  values.push(id);
  await query(`UPDATE patients SET ${sets.join(", ")} WHERE id = $${i}`, values);
}

export async function deletePatient(id: string): Promise<void> {
  if (shouldUseSupabaseData()) return supabaseData.deletePatient(id);
  await query("DELETE FROM patients WHERE id = $1", [id]);
}

// ---------- Assignments ----------
export async function listAssignmentsForPatient(patientId: string): Promise<Assignment[]> {
  if (shouldUseSupabaseData()) return supabaseData.listAssignmentsForPatient(patientId);
  return query<Assignment>(
    "SELECT * FROM caregiver_assignments WHERE patient_id = $1 ORDER BY active DESC, start_date DESC",
    [patientId]
  );
}

export async function createAssignment(input: { patient_id: string; caregiver_user_id: string; start_date: string }): Promise<Assignment> {
  if (shouldUseSupabaseData()) return supabaseData.createAssignment(input);
  const id = randomUUID();
  await query(
    `INSERT INTO caregiver_assignments (id, patient_id, caregiver_user_id, start_date, active) VALUES ($1,$2,$3,$4,1)`,
    [id, input.patient_id, input.caregiver_user_id, input.start_date]
  );
  return (await queryOne<Assignment>("SELECT * FROM caregiver_assignments WHERE id = $1", [id]))!;
}

export async function deactivateAssignment(id: string): Promise<void> {
  if (shouldUseSupabaseData()) return supabaseData.deactivateAssignment(id);
  await query(
    "UPDATE caregiver_assignments SET active = 0, end_date = strftime('%Y-%m-%d','now') WHERE id = $1",
    [id]
  );
}

export async function isCaregiverAssignedToPatient(caregiverUserId: string, patientId: string): Promise<boolean> {
  if (shouldUseSupabaseData()) return supabaseData.isCaregiverAssignedToPatient(caregiverUserId, patientId);
  const row = await queryOne(
    "SELECT 1 FROM caregiver_assignments WHERE caregiver_user_id = $1 AND patient_id = $2 AND active = 1",
    [caregiverUserId, patientId]
  );
  return !!row;
}

// ---------- Leads ----------
export async function listLeads(): Promise<Lead[]> {
  if (shouldUseSupabaseData()) return supabaseData.listLeads();
  return query<Lead>("SELECT * FROM leads ORDER BY created_at DESC");
}

export async function createLead(input: {
  name: string;
  email: string;
  phone: string;
  patient_name?: string;
  care_type?: string;
  message?: string;
}): Promise<Lead> {
  if (shouldUseSupabaseData()) return supabaseData.createLead(input);
  const id = randomUUID();
  const lead: Lead = {
    id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    patient_name: input.patient_name || null,
    care_type: input.care_type || null,
    message: input.message || null,
    status: "novo",
    created_at: new Date().toISOString(),
  };
  await query(
    `INSERT INTO leads
      (id, name, email, phone, patient_name, care_type, message, status, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      lead.id,
      lead.name,
      lead.email,
      lead.phone,
      lead.patient_name,
      lead.care_type,
      lead.message,
      lead.status,
      lead.created_at,
    ]
  );
  return lead;
}

export async function updateLeadStatus(id: string, status: Lead["status"]): Promise<void> {
  if (shouldUseSupabaseData()) return supabaseData.updateLeadStatus(id, status);
  await query("UPDATE leads SET status = $1 WHERE id = $2", [status, id]);
}

export async function deleteLead(id: string): Promise<void> {
  if (shouldUseSupabaseData()) return supabaseData.deleteLead(id);
  await query("DELETE FROM leads WHERE id = $1", [id]);
}

// ---------- Professional applications ----------
export async function listProfessionalApplications(): Promise<ProfessionalApplication[]> {
  if (shouldUseSupabaseData()) return supabaseData.listProfessionalApplications();
  return query<ProfessionalApplication>("SELECT * FROM professional_applications ORDER BY created_at DESC");
}

export async function createProfessionalApplication(input: {
  name: string;
  email: string;
  phone: string;
  city?: string;
  profession: ProfessionalApplication["profession"];
  coren?: string;
  experience?: string;
  availability_days: string[];
  availability_shifts: string[];
  available_from?: string;
  notes?: string;
  lgpd_consent: true;
  privacy_notice_version: string;
}): Promise<ProfessionalApplication> {
  if (shouldUseSupabaseData()) return supabaseData.createProfessionalApplication(input);
  const id = randomUUID();
  await query(
    `INSERT INTO professional_applications
      (id, name, email, phone, city, profession, coren, experience, availability_days,
       availability_shifts, available_from, notes, status, lgpd_consent, lgpd_consent_at,
       privacy_notice_version)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'novo',$13,now(),$14)`,
    [
      id,
      input.name,
      input.email.toLowerCase().trim(),
      input.phone,
      input.city || null,
      input.profession,
      input.coren || null,
      input.experience || null,
      input.availability_days,
      input.availability_shifts,
      input.available_from || null,
      input.notes || null,
      input.lgpd_consent,
      input.privacy_notice_version,
    ]
  );
  return (await queryOne<ProfessionalApplication>("SELECT * FROM professional_applications WHERE id = $1", [id]))!;
}

export async function updateProfessionalApplicationStatus(
  id: string,
  status: ProfessionalApplication["status"],
  reviewedBy: string
): Promise<void> {
  if (shouldUseSupabaseData()) return supabaseData.updateProfessionalApplicationStatus(id, status, reviewedBy);
  if (status === "aprovado") {
    const application = await queryOne<ProfessionalApplication>(
      "SELECT * FROM professional_applications WHERE id = $1",
      [id]
    );
    if (!application) throw new Error("Candidatura não encontrada.");

    await executeBatch([
      {
        text: `UPDATE professional_applications
               SET status = 'aprovado', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2
               WHERE id = $1`,
        params: [id, reviewedBy],
      },
      {
        text: `INSERT INTO caregiver_profiles
        (id, application_id, name, contact_email, phone, city, profession, coren, experience,
         availability_days, availability_shifts, available_from, notes, account_status, approved_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'aguardando_acesso',CURRENT_TIMESTAMP)
       ON CONFLICT (application_id) DO UPDATE SET
         name = excluded.name,
         contact_email = excluded.contact_email,
         phone = excluded.phone,
         city = excluded.city,
         profession = excluded.profession,
         coren = excluded.coren,
         experience = excluded.experience,
         availability_days = excluded.availability_days,
         availability_shifts = excluded.availability_shifts,
         available_from = excluded.available_from,
         notes = excluded.notes,
         account_status = CASE
           WHEN caregiver_profiles.user_id IS NULL THEN 'aguardando_acesso'
           ELSE caregiver_profiles.account_status
         END`,
        params: [
          randomUUID(),
          application.id,
          application.name,
          application.email,
          application.phone,
          application.city,
          application.profession,
          application.coren,
          application.experience,
          application.availability_days,
          application.availability_shifts,
          application.available_from,
          application.notes,
        ],
      },
    ]);
    return;
  }

  if (status === "recusado") {
    await executeBatch([
      {
        text: `UPDATE professional_applications
               SET status = 'recusado', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2
               WHERE id = $1`,
        params: [id, reviewedBy],
      },
      {
        text: "UPDATE caregiver_profiles SET account_status = 'inativo' WHERE application_id = $1",
        params: [id],
      },
    ]);
    return;
  }

  await query(
    "UPDATE professional_applications SET status = $1, reviewed_at = now(), reviewed_by = $2 WHERE id = $3",
    [status, reviewedBy, id]
  );
}

export async function deleteProfessionalApplication(id: string): Promise<void> {
  if (shouldUseSupabaseData()) return supabaseData.deleteProfessionalApplication(id);
  await query("DELETE FROM professional_applications WHERE id = $1", [id]);
}

// ---------- Caregiver bank ----------
export async function listCaregiverProfiles(): Promise<CaregiverProfile[]> {
  if (shouldUseSupabaseData()) return supabaseData.listCaregiverProfiles();
  return query<CaregiverProfile>(
    `SELECT cp.*, u.email AS access_email
     FROM caregiver_profiles cp
     LEFT JOIN users u ON u.id = cp.user_id
     ORDER BY cp.approved_at DESC, cp.name`
  );
}

export async function getCaregiverProfile(id: string): Promise<CaregiverProfile | undefined> {
  if (shouldUseSupabaseData()) return supabaseData.getCaregiverProfile(id);
  return queryOne<CaregiverProfile>(
    `SELECT cp.*, u.email AS access_email
     FROM caregiver_profiles cp
     LEFT JOIN users u ON u.id = cp.user_id
     WHERE cp.id = $1`,
    [id]
  );
}

export async function getCaregiverProfileByUserId(userId: string): Promise<CaregiverProfile | undefined> {
  if (shouldUseSupabaseData()) return supabaseData.getCaregiverProfileByUserId(userId);
  return queryOne<CaregiverProfile>(
    `SELECT cp.*, u.email AS access_email
     FROM caregiver_profiles cp
     LEFT JOIN users u ON u.id = cp.user_id
     WHERE cp.user_id = $1`,
    [userId]
  );
}

export async function createCaregiverAccess(input: {
  profileId: string;
  email: string;
  password: string;
}): Promise<User> {
  if (shouldUseSupabaseData()) return supabaseData.createCaregiverAccess(input);
  const profile = await getCaregiverProfile(input.profileId);
  if (!profile || profile.user_id || profile.account_status !== "aguardando_acesso") {
    throw new Error("Perfil não encontrado ou acesso já criado.");
  }
  if (await getUserByEmail(input.email.toLowerCase().trim())) {
    throw new Error("Este e-mail já está vinculado a outra conta.");
  }

  const userId = randomUUID();
  await executeBatch([
    {
      text: `INSERT INTO users (id, name, email, password_hash, role, phone)
             VALUES ($1,$2,$3,$4,'cuidador',$5)`,
      params: [
        userId,
        profile.name,
        input.email.toLowerCase().trim(),
        hashPassword(input.password),
        profile.phone,
      ],
    },
    {
      text: `UPDATE caregiver_profiles
             SET user_id = $1, account_status = 'ativo'
             WHERE id = $2 AND user_id IS NULL AND account_status = 'aguardando_acesso'`,
      params: [userId, input.profileId],
    },
  ]);
  return (await getUserById(userId))!;
}

async function contractKeysOwnedBy(column: string, ownerId: string): Promise<string[]> {
  const contracts = await query<{ storage_key: string }>(
    `SELECT storage_key FROM contract_documents WHERE ${column} = $1`,
    [ownerId]
  );
  return contracts.map((contract) => contract.storage_key);
}

async function cleanupStoredContracts(keys: string[]): Promise<void> {
  try {
    await deleteStoredFiles(keys);
  } catch (error) {
    console.error("[contracts] Metadados removidos, mas alguns arquivos não puderam ser limpos.", {
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}

export async function deleteCaregiverProfile(id: string): Promise<void> {
  if (shouldUseSupabaseData()) return supabaseData.deleteCaregiverProfile(id);
  const profile = await getCaregiverProfile(id);
  if (!profile) return;
  const keys = await contractKeysOwnedBy("caregiver_profile_id", id);
  if (profile.user_id) {
    keys.push(...(await contractKeysOwnedBy("caregiver_user_id", profile.user_id)));
  }
  const commands: Array<{ text: string; params: unknown[] }> = [
    { text: "DELETE FROM contract_documents WHERE caregiver_profile_id = $1", params: [id] },
  ];
  if (profile.user_id) {
    commands.push(
      { text: "DELETE FROM contract_documents WHERE caregiver_user_id = $1", params: [profile.user_id] },
      { text: "DELETE FROM caregiver_assignments WHERE caregiver_user_id = $1", params: [profile.user_id] }
    );
  }
  commands.push({ text: "DELETE FROM caregiver_profiles WHERE id = $1", params: [id] });
  if (profile.user_id) {
    commands.push(
      {
        text: `UPDATE users
               SET name = 'Profissional removido', email = $1, phone = NULL, password_hash = $2,
                   session_version = session_version + 1, deleted_at = now()
               WHERE id = $3 AND role = 'cuidador' AND deleted_at IS NULL`,
        params: [
          `removido-${profile.user_id}@anonimo.vellora.invalid`,
          hashPassword(randomUUID()),
          profile.user_id,
        ],
      },
      { text: "DELETE FROM password_reset_tokens WHERE user_id = $1", params: [profile.user_id] }
    );
  }
  await executeBatch(commands);
  await cleanupStoredContracts(keys);
}

export async function deleteCaregiverUser(id: string): Promise<void> {
  if (shouldUseSupabaseData()) return supabaseData.deleteCaregiverUser(id);
  const keys = await contractKeysOwnedBy("caregiver_user_id", id);
  await executeBatch([
    { text: "DELETE FROM contract_documents WHERE caregiver_user_id = $1", params: [id] },
    { text: "DELETE FROM caregiver_assignments WHERE caregiver_user_id = $1", params: [id] },
    {
      text: `UPDATE users
             SET name = 'Profissional removido', email = $1, phone = NULL, password_hash = $2,
                 session_version = session_version + 1, deleted_at = now()
             WHERE id = $3 AND role = 'cuidador' AND deleted_at IS NULL`,
      params: [`removido-${id}@anonimo.vellora.invalid`, hashPassword(randomUUID()), id],
    },
    { text: "DELETE FROM password_reset_tokens WHERE user_id = $1", params: [id] },
  ]);
  await cleanupStoredContracts(keys);
}

export async function deleteFamilyUser(id: string): Promise<void> {
  if (shouldUseSupabaseData()) return supabaseData.deleteFamilyUser(id);
  const keys = await contractKeysOwnedBy("family_user_id", id);
  await executeBatch([
    { text: "UPDATE patients SET family_user_id = NULL WHERE family_user_id = $1", params: [id] },
    { text: "DELETE FROM contract_documents WHERE family_user_id = $1", params: [id] },
    {
      text: `UPDATE users
             SET name = 'Conta de família removida', email = $1, phone = NULL, password_hash = $2,
                 session_version = session_version + 1, deleted_at = now()
             WHERE id = $3 AND role = 'familia' AND deleted_at IS NULL`,
      params: [`removido-${id}@anonimo.vellora.invalid`, hashPassword(randomUUID()), id],
    },
    { text: "DELETE FROM password_reset_tokens WHERE user_id = $1", params: [id] },
  ]);
  await cleanupStoredContracts(keys);
}

// ---------- Contract documents ----------
export type ContractOwnerType = "family" | "caregiver_profile" | "caregiver_user";

function contractOwnerWhere(ownerType: ContractOwnerType): string {
  if (ownerType === "family") return "family_user_id";
  if (ownerType === "caregiver_profile") return "caregiver_profile_id";
  return "caregiver_user_id";
}

export async function listContractDocuments(
  ownerType: ContractOwnerType,
  ownerId: string
): Promise<ContractDocument[]> {
  if (shouldUseSupabaseData()) return supabaseData.listContractDocuments(ownerType, ownerId);
  const column = contractOwnerWhere(ownerType);
  return query<ContractDocument>(
    `SELECT id, family_user_id, caregiver_profile_id, caregiver_user_id,
            file_name, mime_type, file_size, uploaded_by, created_at
     FROM contract_documents
     WHERE ${column} = $1
     ORDER BY created_at DESC`,
    [ownerId]
  );
}

export async function listContractDocumentsForCaregiver(userId: string): Promise<ContractDocument[]> {
  if (shouldUseSupabaseData()) return supabaseData.listContractDocumentsForCaregiver(userId);
  return query<ContractDocument>(
    `SELECT cd.id, cd.family_user_id, cd.caregiver_profile_id, cd.caregiver_user_id,
            cd.file_name, cd.mime_type, cd.file_size, cd.uploaded_by, cd.created_at
     FROM contract_documents cd
     LEFT JOIN caregiver_profiles cp ON cp.id = cd.caregiver_profile_id
     WHERE cd.caregiver_user_id = $1 OR cp.user_id = $1
     ORDER BY cd.created_at DESC`,
    [userId]
  );
}

export async function getContractDocument(id: string): Promise<ContractDocument | undefined> {
  if (shouldUseSupabaseData()) return supabaseData.getContractDocument(id);
  return queryOne<ContractDocument>(
    `SELECT id, family_user_id, caregiver_profile_id, caregiver_user_id,
            file_name, mime_type, file_size, uploaded_by, created_at
     FROM contract_documents WHERE id = $1`,
    [id]
  );
}

export async function getContractFileData(id: string): Promise<Uint8Array | null> {
  if (shouldUseSupabaseData()) return supabaseData.getContractFileData(id);
  const contract = await queryOne<StoredContractDocument>(
    "SELECT * FROM contract_documents WHERE id = $1",
    [id]
  );
  return contract ? getStoredFile(contract.storage_key) : null;
}

export async function createContractDocument(input: {
  ownerType: ContractOwnerType;
  ownerId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileData: Uint8Array;
  uploadedBy: string;
}): Promise<ContractDocument> {
  if (shouldUseSupabaseData()) return supabaseData.createContractDocument(input);
  const id = randomUUID();
  const storageKey = `contracts/${id}.pdf`;
  const familyUserId = input.ownerType === "family" ? input.ownerId : null;
  const caregiverProfileId = input.ownerType === "caregiver_profile" ? input.ownerId : null;
  const caregiverUserId = input.ownerType === "caregiver_user" ? input.ownerId : null;
  await putStoredFile(storageKey, input.fileData, input.mimeType);
  try {
    await query(
      `INSERT INTO contract_documents
        (id, family_user_id, caregiver_profile_id, caregiver_user_id, file_name,
         mime_type, file_size, storage_key, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        id,
        familyUserId,
        caregiverProfileId,
        caregiverUserId,
        input.fileName,
        input.mimeType,
        input.fileSize,
        storageKey,
        input.uploadedBy,
      ]
    );
  } catch (error) {
    await deleteStoredFile(storageKey).catch(() => undefined);
    throw error;
  }
  return (await queryOne<ContractDocument>(
    `SELECT id, family_user_id, caregiver_profile_id, caregiver_user_id,
            file_name, mime_type, file_size, uploaded_by, created_at
     FROM contract_documents WHERE id = $1`,
    [id]
  ))!;
}

export async function deleteContractDocument(id: string): Promise<void> {
  if (shouldUseSupabaseData()) return supabaseData.deleteContractDocument(id);
  const contract = await queryOne<{ storage_key: string }>(
    "SELECT storage_key FROM contract_documents WHERE id = $1",
    [id]
  );
  await query("DELETE FROM contract_documents WHERE id = $1", [id]);
  if (contract) await cleanupStoredContracts([contract.storage_key]);
}

// ---------- Daily records ----------
export async function listRecordsForPatient(patientId: string, limit = 90): Promise<DailyRecord[]> {
  if (shouldUseSupabaseData()) return supabaseData.listRecordsForPatient(patientId, limit);
  return query<DailyRecord>(
    "SELECT * FROM daily_records WHERE patient_id = $1 ORDER BY record_date DESC, record_time DESC NULLS LAST, created_at DESC LIMIT $2",
    [patientId, limit]
  );
}

export async function getRecord(id: string): Promise<DailyRecord | undefined> {
  if (shouldUseSupabaseData()) return supabaseData.getRecord(id);
  return queryOne<DailyRecord>("SELECT * FROM daily_records WHERE id = $1", [id]);
}

export async function getRecordForCaregiverOnDate(
  patientId: string,
  caregiverUserId: string,
  recordDate: string
): Promise<DailyRecord | undefined> {
  if (shouldUseSupabaseData()) return supabaseData.getRecordForCaregiverOnDate(patientId, caregiverUserId, recordDate);
  return queryOne<DailyRecord>(
    `SELECT * FROM daily_records
     WHERE patient_id = $1 AND caregiver_user_id = $2 AND record_date = $3
     ORDER BY record_time DESC, created_at DESC
     LIMIT 1`,
    [patientId, caregiverUserId, recordDate]
  );
}

export async function createRecord(
  input: Omit<DailyRecord, "id" | "created_at" | "updated_at">,
  actor: RecordAuditActor = { userId: input.caregiver_user_id, name: "Cuidador" }
): Promise<DailyRecord> {
  if (shouldUseSupabaseData()) return supabaseData.createRecord(input, actor);
  const id = randomUUID();
  await executeBatch([
    {
      text: `INSERT INTO daily_records
        (id, patient_id, caregiver_user_id, record_date, record_time, bp_systolic, bp_diastolic, heart_rate, temperature, spo2, glucose,
         medications, feeding, hygiene, mobility, mood, pain_level, notes, incident, incident_description, photo_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
      params: [
        id,
        input.patient_id,
        input.caregiver_user_id,
        input.record_date,
        input.record_time,
        input.bp_systolic,
        input.bp_diastolic,
        input.heart_rate,
        input.temperature,
        input.spo2,
        input.glucose,
        input.medications,
        input.feeding,
        input.hygiene,
        input.mobility,
        input.mood,
        input.pain_level,
        input.notes,
        input.incident,
        input.incident_description,
        input.photo_data,
      ],
    },
    {
      text: `INSERT INTO daily_record_audit_events
        (id, record_id, patient_id, actor_user_id, actor_name, action, changed_fields, after_data)
       VALUES ($1,$2,$3,$4,$5,'created',$6,$7)`,
      params: [
        randomUUID(),
        id,
        input.patient_id,
        actor.userId,
        actor.name.slice(0, 160),
        JSON.stringify(Object.keys(snapshotDailyRecord(input))),
        JSON.stringify(snapshotDailyRecord(input)),
      ],
    },
  ]);
  return (await getRecord(id))!;
}

export async function updateRecord(
  id: string,
  fields: Partial<Omit<DailyRecord, "id" | "created_at" | "updated_at" | "patient_id" | "caregiver_user_id">>,
  actor: RecordAuditActor
): Promise<DailyRecord | undefined> {
  if (shouldUseSupabaseData()) return supabaseData.updateRecord(id, fields, actor);
  const existing = await getRecord(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...fields };
  const changedFields = diffDailyRecord(existing, merged);
  if (changedFields.length === 0) return existing;

  const allowed = [
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
  const sets: string[] = [];
  const params: unknown[] = [];
  let parameterIndex = 1;
  for (const field of allowed) {
    if (!(field in fields)) continue;
    sets.push(`${field} = $${parameterIndex}`);
    params.push(fields[field]);
    parameterIndex += 1;
  }
  sets.push("updated_at = CURRENT_TIMESTAMP");
  params.push(id);

  await executeBatch([
    {
      text: `UPDATE daily_records SET ${sets.join(", ")} WHERE id = $${parameterIndex}`,
      params,
    },
    {
      text: `INSERT INTO daily_record_audit_events
        (id, record_id, patient_id, actor_user_id, actor_name, action, changed_fields, before_data, after_data)
       VALUES ($1,$2,$3,$4,$5,'updated',$6,$7,$8)`,
      params: [
        randomUUID(),
        id,
        existing.patient_id,
        actor.userId,
        actor.name.slice(0, 160),
        JSON.stringify(changedFields),
        JSON.stringify(snapshotDailyRecord(existing)),
        JSON.stringify(snapshotDailyRecord(merged)),
      ],
    },
  ]);

  return (await getRecord(id))!;
}

export async function listRecordAuditForPatient(
  patientId: string,
  limit = 50
): Promise<DailyRecordAuditEvent[]> {
  if (shouldUseSupabaseData()) return supabaseData.listRecordAuditForPatient(patientId, limit);
  return query<DailyRecordAuditEvent>(
    `SELECT * FROM daily_record_audit_events
     WHERE patient_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [patientId, limit]
  );
}

export async function countPendingLeads(): Promise<number> {
  if (shouldUseSupabaseData()) return supabaseData.countPendingLeads();
  const result = await queryOne<{ total: number }>(
    "SELECT COUNT(*) AS total FROM leads WHERE status IN ('novo','em_contato')"
  );
  return Number(result?.total || 0);
}

export async function getCaregiverName(id: string): Promise<string> {
  if (shouldUseSupabaseData()) return supabaseData.getCaregiverName(id);
  const u = await getUserById(id);
  return u ? u.name : "Cuidador";
}

/** Busca vários usuários de uma vez e devolve um mapa id -> nome (evita N chamadas em loops). */
export async function getCaregiverNamesMap(ids: string[]): Promise<Record<string, string>> {
  if (shouldUseSupabaseData()) return supabaseData.getCaregiverNamesMap(ids);
  const uniqueIds = [...new Set(ids)];
  const users = await getUsersByIds(uniqueIds);
  const map: Record<string, string> = {};
  for (const u of users) map[u.id] = u.name;
  return map;
}
