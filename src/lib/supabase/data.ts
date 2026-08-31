import { randomUUID } from "crypto";
import { createClient, type SupabaseClient, type User as SupabaseAuthUser } from "@supabase/supabase-js";
import { runtimeValue } from "../runtime-config";
import { resolveAuthProvider } from "../auth-provider";
import {
  createSupabaseServerClient,
} from "./server";
import { validateSupabaseConfig } from "./config";
import type {
  Assignment,
  CaregiverProfile,
  ContractDocument,
  ContractOwnerType,
  DailyRecord,
  DailyRecordAuditEvent,
  Lead,
  Patient,
  ProfessionalApplication,
  RecordAuditActor,
  User,
} from "../data";
import { diffDailyRecord, snapshotDailyRecord } from "../record-utils";
import {
  deleteStoredFile,
  deleteStoredFiles,
  getStoredFile,
  putStoredFile,
} from "../storage";
import {
  ASSIGNMENT_ACTIVE_CONFLICT_MESSAGE,
  ASSIGNMENT_DUPLICATE_CONFLICT_MESSAGE,
  ASSIGNMENT_HISTORY_CONFLICT_MESSAGE,
  AssignmentConflictError,
  isAssignmentUniqueViolation,
} from "../assignment-errors";
import { DUPLICATE_ACCOUNT_EMAIL_MESSAGE, isDuplicateAccountEmailError } from "../user-errors";

export type DataProvider = "legacy" | "supabase";

export class SupabaseDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseDataError";
  }
}

/**
 * Resolves the data backend without enabling Supabase accidentally. The empty
 * value is deliberately compatible with the existing D1 runtime.
 */
export function resolveDataProvider(value: string | undefined): DataProvider {
  return value?.trim().toLowerCase() === "supabase" ? "supabase" : "legacy";
}

export function getDataProvider(): DataProvider {
  return resolveDataProvider(runtimeValue("VELLORA_DATA_PROVIDER"));
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROLE_VALUES = new Set<User["role"]>(["admin", "familia", "cuidador"]);
const PROFESSIONAL_STATUS_VALUES = new Set<ProfessionalApplication["status"]>([
  "novo",
  "em_analise",
  "aprovado",
  "recusado",
]);
const PROFESSIONAL_VALUES = new Set<ProfessionalApplication["profession"]>([
  "cuidador",
  "tecnico_enfermagem",
  "enfermeiro",
  "outros",
]);
const LEAD_STATUS_VALUES = new Set<Lead["status"]>([
  "novo",
  "em_contato",
  "convertido",
  "recusado",
]);
const CAREGIVER_STATUS_VALUES = new Set<CaregiverProfile["account_status"]>([
  "aguardando_acesso",
  "ativo",
  "inativo",
]);

function serverOnly(): void {
  if (typeof window !== "undefined") {
    throw new SupabaseDataError("O adapter de dados Supabase só pode ser usado no servidor.");
  }
}

function assertUuid(value: string, label: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw new SupabaseDataError(`${label} não é um UUID Supabase válido.`);
  }
  return value;
}

function assertAuthAndDataProviders(): void {
  if (resolveAuthProvider(runtimeValue("VELLORA_AUTH_PROVIDER")) !== "supabase") {
    throw new SupabaseDataError(
      "VELLORA_DATA_PROVIDER=supabase exige VELLORA_AUTH_PROVIDER=supabase para evitar misturar IDs D1 e Supabase.",
    );
  }
}

function publicConfig() {
  return validateSupabaseConfig(
    runtimeValue("NEXT_PUBLIC_SUPABASE_URL") || runtimeValue("SUPABASE_URL"),
    runtimeValue("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
      runtimeValue("SUPABASE_PUBLISHABLE_KEY") ||
      runtimeValue("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
      runtimeValue("SUPABASE_ANON_KEY"),
  );
}

async function requestClient(): Promise<SupabaseClient> {
  serverOnly();
  assertAuthAndDataProviders();
  // This client carries the current request's cookies and therefore enforces
  // the caller's RLS policies on every ordinary application operation.
  return createSupabaseServerClient();
}

function serviceClient(): SupabaseClient {
  serverOnly();
  assertAuthAndDataProviders();
  const config = publicConfig();
  const serviceKey =
    runtimeValue("SUPABASE_SECRET_KEY") || runtimeValue("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey?.trim()) {
    throw new SupabaseDataError(
      "Configure SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY) somente no servidor para operações internas Supabase.",
    );
  }

  // This client is intentionally never imported by a browser entry point. It
  // is reserved for Auth Admin, public intake and server-side audit writes,
  // which are denied to anon/authenticated by the production policies.
  return createClient(config.url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

type SupabaseRow = Record<string, unknown>;

function operationError(context: string, error: unknown): SupabaseDataError {
  const message =
    error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message
      : "erro desconhecido";
  return new SupabaseDataError(`${context}: ${message}`);
}

function requireNoError(context: string, error: unknown): void {
  if (error) throw operationError(context, error);
}

function requireValue<T>(context: string, data: T | null | undefined, error: unknown): T {
  requireNoError(context, error);
  if (data == null) throw new SupabaseDataError(`${context}: nenhum registro retornado.`);
  return data;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asJsonString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function asRole(value: unknown): User["role"] {
  if (typeof value === "string" && ROLE_VALUES.has(value as User["role"])) {
    return value as User["role"];
  }
  throw new SupabaseDataError("Perfil Supabase contém um papel inválido.");
}

function asLeadStatus(value: unknown): Lead["status"] {
  if (typeof value === "string" && LEAD_STATUS_VALUES.has(value as Lead["status"])) {
    return value as Lead["status"];
  }
  throw new SupabaseDataError("Lead Supabase contém um status inválido.");
}

function asProfessionalStatus(value: unknown): ProfessionalApplication["status"] {
  if (
    typeof value === "string" &&
    PROFESSIONAL_STATUS_VALUES.has(value as ProfessionalApplication["status"])
  ) {
    return value as ProfessionalApplication["status"];
  }
  throw new SupabaseDataError("Candidatura Supabase contém um status inválido.");
}

function asProfession(value: unknown): ProfessionalApplication["profession"] {
  if (typeof value === "string" && PROFESSIONAL_VALUES.has(value as ProfessionalApplication["profession"])) {
    return value as ProfessionalApplication["profession"];
  }
  throw new SupabaseDataError("Perfil profissional Supabase contém uma profissão inválida.");
}

function asCaregiverStatus(value: unknown): CaregiverProfile["account_status"] {
  if (typeof value === "string" && CAREGIVER_STATUS_VALUES.has(value as CaregiverProfile["account_status"])) {
    return value as CaregiverProfile["account_status"];
  }
  throw new SupabaseDataError("Perfil de cuidador Supabase contém um status inválido.");
}

function normalizeTime(value: unknown): string | null {
  const result = asNullableString(value);
  return result ? result.slice(0, 5) : null;
}

function mapProfile(row: SupabaseRow, authUser?: SupabaseAuthUser | null): User {
  const active = asBoolean(row.active);
  return {
    id: assertUuid(asString(row.id), "Perfil"),
    name: asString(row.name, authUser?.email || "Usuário Vellora"),
    email: asString(authUser?.email),
    // Supabase Auth owns passwords. This empty compatibility field must never
    // be read by the Supabase login path or treated as a password hash.
    password_hash: "",
    role: asRole(row.role),
    phone: asNullableString(row.phone),
    session_version: 0,
    deleted_at: active ? null : asNullableString(row.updated_at) || asNullableString(row.created_at),
    created_at: asString(row.created_at),
  };
}

function mapPatient(row: SupabaseRow): Patient {
  const status = asString(row.status);
  if (status !== "pendente" && status !== "ativo" && status !== "inativo") {
    throw new SupabaseDataError("Paciente Supabase contém um status inválido.");
  }
  return {
    id: assertUuid(asString(row.id), "Paciente"),
    name: asString(row.name),
    birth_date: asNullableString(row.birth_date),
    address: asNullableString(row.address),
    care_level: asNullableString(row.care_level),
    condition_summary: asNullableString(row.condition_summary),
    family_user_id: asNullableString(row.family_user_id),
    status,
    notes: asNullableString(row.notes),
    created_at: asString(row.created_at),
  };
}

function mapAssignment(row: SupabaseRow): Assignment {
  return {
    id: assertUuid(asString(row.id), "Assignment"),
    patient_id: assertUuid(asString(row.patient_id), "Paciente do assignment"),
    caregiver_user_id: assertUuid(asString(row.caregiver_user_id), "Cuidador do assignment"),
    start_date: asString(row.start_date),
    end_date: asNullableString(row.end_date),
    active: asBoolean(row.active) ? 1 : 0,
    created_at: asString(row.created_at),
  };
}

function mapLead(row: SupabaseRow): Lead {
  return {
    id: assertUuid(asString(row.id), "Lead"),
    name: asString(row.name),
    email: asString(row.email),
    phone: asString(row.phone),
    patient_name: asNullableString(row.patient_name),
    care_type: asNullableString(row.care_type),
    message: asNullableString(row.message),
    status: asLeadStatus(row.status),
    created_at: asString(row.created_at),
  };
}

function mapProfessionalApplication(row: SupabaseRow): ProfessionalApplication {
  return {
    id: assertUuid(asString(row.id), "Candidatura"),
    name: asString(row.name),
    email: asString(row.email),
    phone: asString(row.phone),
    city: asNullableString(row.city),
    profession: asProfession(row.profession),
    coren: asNullableString(row.coren),
    experience: asNullableString(row.experience),
    availability_days: asStringArray(row.availability_days),
    availability_shifts: asStringArray(row.availability_shifts),
    available_from: asNullableString(row.available_from),
    notes: asNullableString(row.notes),
    status: asProfessionalStatus(row.status),
    lgpd_consent: asBoolean(row.lgpd_consent),
    lgpd_consent_at: asNullableString(row.lgpd_consent_at),
    privacy_notice_version: asNullableString(row.privacy_notice_version),
    reviewed_at: asNullableString(row.reviewed_at),
    reviewed_by: asNullableString(row.reviewed_by),
    created_at: asString(row.created_at),
  };
}

function mapCaregiverProfile(row: SupabaseRow, accessEmail?: string | null): CaregiverProfile {
  return {
    id: assertUuid(asString(row.id), "Perfil de cuidador"),
    application_id: asNullableString(row.application_id),
    user_id: asNullableString(row.user_id),
    name: asString(row.name),
    contact_email: asString(row.contact_email),
    access_email: accessEmail || null,
    phone: asString(row.phone),
    city: asNullableString(row.city),
    profession: asProfession(row.profession),
    coren: asNullableString(row.coren),
    experience: asNullableString(row.experience),
    availability_days: asStringArray(row.availability_days),
    availability_shifts: asStringArray(row.availability_shifts),
    available_from: asNullableString(row.available_from),
    notes: asNullableString(row.notes),
    account_status: asCaregiverStatus(row.account_status),
    approved_at: asString(row.approved_at),
    created_at: asString(row.created_at),
  };
}

function mapContract(row: SupabaseRow): ContractDocument {
  return {
    id: assertUuid(asString(row.id), "Contrato"),
    family_user_id: asNullableString(row.family_user_id),
    caregiver_profile_id: asNullableString(row.caregiver_profile_id),
    caregiver_user_id: asNullableString(row.caregiver_user_id),
    file_name: asString(row.file_name),
    mime_type: asString(row.mime_type),
    file_size: asNumber(row.file_size) || 0,
    uploaded_by: asNullableString(row.uploaded_by),
    created_at: asString(row.created_at),
  };
}

function mapDailyRecord(row: SupabaseRow): DailyRecord {
  return {
    id: assertUuid(asString(row.id), "Registro diário"),
    patient_id: assertUuid(asString(row.patient_id), "Paciente do registro"),
    caregiver_user_id: assertUuid(asString(row.caregiver_user_id), "Cuidador do registro"),
    record_date: asString(row.record_date),
    record_time: normalizeTime(row.record_time),
    bp_systolic: asNumber(row.bp_systolic),
    bp_diastolic: asNumber(row.bp_diastolic),
    heart_rate: asNumber(row.heart_rate),
    temperature: asNumber(row.temperature),
    spo2: asNumber(row.spo2),
    glucose: asNumber(row.glucose),
    medications: asNullableString(row.medications),
    feeding: asNullableString(row.feeding),
    hygiene: asNullableString(row.hygiene),
    mobility: asNullableString(row.mobility),
    mood: asNullableString(row.mood),
    pain_level: asNumber(row.pain_level),
    notes: asNullableString(row.notes),
    incident: asBoolean(row.incident) ? 1 : 0,
    incident_description: asNullableString(row.incident_description),
    // Hydrated asynchronously from Storage. This compatibility field never
    // represents bytes persisted in Postgres.
    photo_data: null,
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

function mapAuditEvent(row: SupabaseRow): DailyRecordAuditEvent {
  if (row.action !== "created" && row.action !== "updated") {
    throw new SupabaseDataError("Auditoria Supabase contém uma ação inválida.");
  }
  return {
    id: assertUuid(asString(row.id), "Auditoria"),
    record_id: assertUuid(asString(row.record_id), "Registro da auditoria"),
    patient_id: assertUuid(asString(row.patient_id), "Paciente da auditoria"),
    actor_user_id: asNullableString(row.actor_user_id),
    actor_name: asString(row.actor_name),
    action: row.action,
    changed_fields: asStringArray(row.changed_fields),
    before_data: asJsonString(row.before_data),
    after_data: asJsonString(row.after_data),
    created_at: asString(row.created_at),
  };
}

function storageEnabled(): void {
  if (runtimeValue("VELLORA_STORAGE_PROVIDER")?.trim().toLowerCase() !== "supabase") {
    throw new SupabaseDataError(
      "VELLORA_DATA_PROVIDER=supabase exige VELLORA_STORAGE_PROVIDER=supabase antes de manipular arquivos.",
    );
  }
}

function photoExtension(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

function parsePhotoDataUri(value: string): { contentType: string; bytes: Uint8Array } {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(value);
  if (!match) {
    throw new SupabaseDataError(
      "Foto inválida para o provider Supabase; envie uma imagem ou deixe o campo vazio.",
    );
  }
  const bytes = new Uint8Array(Buffer.from(match[2], "base64"));
  if (bytes.length === 0) throw new SupabaseDataError("Foto vazia.");
  return { contentType: match[1], bytes };
}

async function uploadRecordPhoto(
  patientId: string,
  recordId: string,
  value: string | null,
): Promise<string | null> {
  if (!value) return null;
  storageEnabled();
  const parsed = parsePhotoDataUri(value);
  const key = `patients/${assertUuid(patientId, "Paciente")}/records/${assertUuid(recordId, "Registro")}/${randomUUID()}.${photoExtension(parsed.contentType)}`;
  await putStoredFile(key, parsed.bytes, parsed.contentType);
  return key;
}

function contentTypeFromStorageKey(key: string): string {
  if (/\.png$/i.test(key)) return "image/png";
  if (/\.webp$/i.test(key)) return "image/webp";
  return "image/jpeg";
}

async function hydratePhoto(record: DailyRecord, row: SupabaseRow): Promise<DailyRecord> {
  const key = asNullableString(row.photo_storage_key);
  if (!key) return record;
  storageEnabled();
  const bytes = await getStoredFile(key);
  if (!bytes) return record;
  return {
    ...record,
    photo_data: `data:${contentTypeFromStorageKey(key)};base64,${Buffer.from(bytes).toString("base64")}`,
  };
}

async function hydratePhotos(rows: SupabaseRow[]): Promise<DailyRecord[]> {
  return Promise.all(rows.map(async (row) => hydratePhoto(mapDailyRecord(row), row)));
}

type ProfileWithAuth = { profile: SupabaseRow; authUser: SupabaseAuthUser | null };

async function listAuthUsers(client: SupabaseClient): Promise<SupabaseAuthUser[]> {
  const users: SupabaseAuthUser[] = [];
  let page = 1;
  const perPage = 1_000;
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    requireNoError("Não foi possível listar usuários Auth Supabase", error);
    const pageUsers = data?.users || [];
    users.push(...pageUsers);
    if (pageUsers.length < perPage) break;
    page += 1;
  }
  return users;
}

async function profilesWithAuth(ids?: string[]): Promise<ProfileWithAuth[]> {
  const client = serviceClient();
  let query = client.from("profiles").select("*");
  if (ids && ids.length > 0) query = query.in("id", ids.map((id) => assertUuid(id, "Perfil")));
  const { data, error } = await query;
  requireNoError("Não foi possível consultar perfis Supabase", error);
  const authUsers = await listAuthUsers(client);
  const authById = new Map(authUsers.map((user) => [user.id, user]));
  return ((data || []) as SupabaseRow[]).map((profile) => ({
    profile,
    authUser: authById.get(asString(profile.id)) || null,
  }));
}

async function profileWithAuth(id: string): Promise<ProfileWithAuth | undefined> {
  const rows = await profilesWithAuth([id]);
  return rows[0];
}

async function activeAuthUserByEmail(email: string): Promise<ProfileWithAuth | undefined> {
  const normalized = email.trim().toLowerCase();
  const rows = await profilesWithAuth();
  return rows.find(
    ({ profile, authUser }) =>
      asBoolean(profile.active) && authUser?.email?.trim().toLowerCase() === normalized,
  );
}

async function createAuthProfile(
  client: SupabaseClient,
  input: { name: string; email: string; password: string; role: User["role"]; phone?: string },
): Promise<User> {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password) throw new SupabaseDataError("E-mail e senha são obrigatórios.");
  const { data: authData, error: authError } = await client.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });
  if (authError && isDuplicateAccountEmailError(authError)) {
    throw new SupabaseDataError(DUPLICATE_ACCOUNT_EMAIL_MESSAGE);
  }
  requireNoError("Não foi possível criar usuário no Supabase Auth", authError);
  if (!authData.user) throw new SupabaseDataError("Supabase Auth não retornou o usuário criado.");

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .insert({
      id: authData.user.id,
      name: input.name,
      role: input.role,
      phone: input.phone?.trim() || null,
      active: true,
    })
    .select("*")
    .single();
  if (profileError || !profile) {
    await client.auth.admin.deleteUser(authData.user.id).catch(() => undefined);
    throw operationError("Não foi possível criar perfil de aplicação Supabase", profileError);
  }
  return mapProfile(profile as SupabaseRow, authData.user);
}

async function deactivateProfile(client: SupabaseClient, id: string, name: string): Promise<void> {
  const profileId = assertUuid(id, "Perfil");
  const { error } = await client
    .from("profiles")
    .update({ name, phone: null, active: false, updated_at: new Date().toISOString() })
    .eq("id", profileId);
  requireNoError("Não foi possível desativar perfil Supabase", error);

  // The profile is the authorization source. Rotating the Auth e-mail is a
  // compatibility measure that permits a future account to reuse the address;
  // old sessions remain unusable because the profile is inactive.
  const anonymizedEmail = `removido-${profileId}@anonimo.vellora.invalid`;
  const { error: authError } = await client.auth.admin.updateUserById(profileId, {
    email: anonymizedEmail,
    email_confirm: true,
  });
  if (authError) {
    console.error("[supabase-data] Perfil desativado, mas não foi possível anonimizar o e-mail Auth.", {
      error: authError.message,
    });
  }
}

async function contractKeys(
  client: SupabaseClient,
  column: "family_user_id" | "caregiver_profile_id" | "caregiver_user_id",
  id: string,
): Promise<string[]> {
  const { data, error } = await client
    .from("contract_documents")
    .select("storage_key")
    .eq(column, assertUuid(id, "Proprietário do contrato"));
  requireNoError("Não foi possível consultar arquivos de contrato", error);
  return ((data || []) as SupabaseRow[])
    .map((row) => asNullableString(row.storage_key))
    .filter((key): key is string => Boolean(key));
}

async function cleanupContracts(keys: string[]): Promise<void> {
  if (!keys.length) return;
  try {
    storageEnabled();
    await deleteStoredFiles(keys);
  } catch (error) {
    console.error("[supabase-data] Metadados removidos, mas arquivos não puderam ser limpos.", {
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}

// ---------- Users ----------
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const match = await activeAuthUserByEmail(email);
  return match ? mapProfile(match.profile, match.authUser) : undefined;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const match = await profileWithAuth(assertUuid(id, "Usuário"));
  return match ? mapProfile(match.profile, match.authUser) : undefined;
}

export async function getUsersByIds(ids: string[]): Promise<User[]> {
  if (!ids.length) return [];
  const uniqueIds = [...new Set(ids.map((id) => assertUuid(id, "Usuário")))];
  const rows = await profilesWithAuth(uniqueIds);
  const byId = new Map(rows.map((row) => [asString(row.profile.id), row]));
  return uniqueIds
    .map((id) => byId.get(id))
    .filter((row): row is ProfileWithAuth => Boolean(row))
    .map((row) => mapProfile(row.profile, row.authUser));
}

export async function listUsersByRole(role: string): Promise<User[]> {
  const normalizedRole = asRole(role.trim().toLowerCase());
  const rows = (await profilesWithAuth()).filter(
    ({ profile }) => asBoolean(profile.active) && profile.role === normalizedRole,
  );
  return rows.sort((a, b) => asString(a.profile.name).localeCompare(asString(b.profile.name)))
    .map((row) => mapProfile(row.profile, row.authUser));
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: User["role"];
  phone?: string;
}): Promise<User> {
  return createAuthProfile(serviceClient(), input);
}

// ---------- Patients ----------
export async function listPatients(): Promise<Patient[]> {
  const client = await requestClient();
  const { data, error } = await client.from("patients").select("*").order("created_at", { ascending: false });
  requireNoError("Não foi possível listar pacientes Supabase", error);
  return ((data || []) as SupabaseRow[]).map(mapPatient);
}

export async function getPatient(id: string): Promise<Patient | undefined> {
  const client = await requestClient();
  const { data, error } = await client.from("patients").select("*").eq("id", assertUuid(id, "Paciente")).maybeSingle();
  requireNoError("Não foi possível consultar paciente Supabase", error);
  return data ? mapPatient(data as SupabaseRow) : undefined;
}

export async function listPatientsByFamily(familyUserId: string): Promise<Patient[]> {
  const client = await requestClient();
  const { data, error } = await client
    .from("patients")
    .select("*")
    .eq("family_user_id", assertUuid(familyUserId, "Família"))
    .order("created_at", { ascending: false });
  requireNoError("Não foi possível listar pacientes da família", error);
  return ((data || []) as SupabaseRow[]).map(mapPatient);
}

export async function listPatientsByCaregiver(caregiverUserId: string): Promise<Patient[]> {
  const client = await requestClient();
  const caregiverId = assertUuid(caregiverUserId, "Cuidador");
  const { data: assignments, error: assignmentError } = await client
    .from("caregiver_assignments")
    .select("patient_id")
    .eq("caregiver_user_id", caregiverId)
    .eq("active", true);
  requireNoError("Não foi possível consultar assignments do cuidador", assignmentError);
  const patientIds = ((assignments || []) as SupabaseRow[])
    .map((row) => asNullableString(row.patient_id))
    .filter((id): id is string => Boolean(id));
  if (!patientIds.length) return [];
  const { data, error } = await client.from("patients").select("*").in("id", patientIds).order("name");
  requireNoError("Não foi possível listar pacientes do cuidador", error);
  return ((data || []) as SupabaseRow[]).map(mapPatient);
}

export async function createPatient(input: {
  name: string;
  birth_date?: string;
  address?: string;
  care_level?: string;
  condition_summary?: string;
  family_user_id?: string | null;
  status?: Patient["status"];
  notes?: string;
}): Promise<Patient> {
  const client = await requestClient();
  const row = {
    id: randomUUID(),
    name: input.name,
    birth_date: input.birth_date || null,
    address: input.address || null,
    care_level: input.care_level || null,
    condition_summary: input.condition_summary || null,
    family_user_id: input.family_user_id ? assertUuid(input.family_user_id, "Família") : null,
    status: input.status || "pendente",
    notes: input.notes || null,
  };
  const { data, error } = await client.from("patients").insert(row).select("*").single();
  return mapPatient(requireValue("Não foi possível criar paciente Supabase", data as SupabaseRow | null, error));
}

export async function updatePatient(id: string, fields: Partial<Patient>): Promise<void> {
  const client = await requestClient();
  const allowed = [
    "name",
    "birth_date",
    "address",
    "care_level",
    "condition_summary",
    "family_user_id",
    "status",
    "notes",
  ] as const;
  const update: SupabaseRow = {};
  for (const key of allowed) {
    if (key in fields) {
      update[key] = key === "family_user_id" && fields[key]
        ? assertUuid(fields[key] as string, "Família")
        : fields[key] ?? null;
    }
  }
  if (!Object.keys(update).length) return;
  const { error } = await client.from("patients").update(update).eq("id", assertUuid(id, "Paciente"));
  requireNoError("Não foi possível atualizar paciente Supabase", error);
}

export async function deletePatient(id: string): Promise<void> {
  const client = await requestClient();
  const { error } = await client.from("patients").delete().eq("id", assertUuid(id, "Paciente"));
  requireNoError("Não foi possível excluir paciente Supabase", error);
}

// ---------- Assignments ----------
export async function listAssignmentsForPatient(patientId: string): Promise<Assignment[]> {
  const client = await requestClient();
  const { data, error } = await client
    .from("caregiver_assignments")
    .select("*")
    .eq("patient_id", assertUuid(patientId, "Paciente"))
    .order("active", { ascending: false })
    .order("start_date", { ascending: false });
  requireNoError("Não foi possível listar assignments Supabase", error);
  return ((data || []) as SupabaseRow[]).map(mapAssignment);
}

export async function createAssignment(input: {
  patient_id: string;
  caregiver_user_id: string;
  start_date: string;
}): Promise<Assignment> {
  const client = await requestClient();
  const patientId = assertUuid(input.patient_id, "Paciente");
  const caregiverUserId = assertUuid(input.caregiver_user_id, "Cuidador");

  const { data: inactiveData, error: inactiveError } = await client
    .from("caregiver_assignments")
    .select("*")
    .eq("patient_id", patientId)
    .eq("caregiver_user_id", caregiverUserId)
    .eq("start_date", input.start_date)
    .eq("active", false)
    .order("created_at", { ascending: false })
    .limit(2);
  requireNoError("Não foi possível verificar vínculo histórico Supabase", inactiveError);

  const inactiveRows = (inactiveData || []) as SupabaseRow[];
  if (inactiveRows.length > 1) {
    throw new AssignmentConflictError("duplicate_history", ASSIGNMENT_HISTORY_CONFLICT_MESSAGE);
  }

  const { data: activeData, error: activeError } = await client
    .from("caregiver_assignments")
    .select("*")
    .eq("patient_id", patientId)
    .eq("caregiver_user_id", caregiverUserId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  requireNoError("Não foi possível verificar vínculo ativo Supabase", activeError);
  if (activeData) {
    throw new AssignmentConflictError("active_duplicate", ASSIGNMENT_ACTIVE_CONFLICT_MESSAGE);
  }

  const inactiveAssignment = inactiveRows[0];
  if (inactiveAssignment) {
    const assignmentId = assertUuid(asString(inactiveAssignment.id), "Assignment");
    const { data: restoredData, error: restoredError } = await client
      .from("caregiver_assignments")
      .update({ active: true, end_date: null, updated_at: new Date().toISOString() })
      .eq("id", assignmentId)
      .eq("active", false)
      .select("*")
      .maybeSingle();
    if (restoredError) {
      if (isAssignmentUniqueViolation(restoredError)) {
        throw new AssignmentConflictError("duplicate_assignment", ASSIGNMENT_DUPLICATE_CONFLICT_MESSAGE);
      }
      throw operationError("Não foi possível reativar assignment Supabase", restoredError);
    }
    if (restoredData) return mapAssignment(restoredData as SupabaseRow);

    const { data: activeAfterRace, error: activeAfterRaceError } = await client
      .from("caregiver_assignments")
      .select("id")
      .eq("patient_id", patientId)
      .eq("caregiver_user_id", caregiverUserId)
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    requireNoError("Não foi possível confirmar a reativação Supabase", activeAfterRaceError);
    if (activeAfterRace) {
      throw new AssignmentConflictError("active_duplicate", ASSIGNMENT_ACTIVE_CONFLICT_MESSAGE);
    }
    throw new SupabaseDataError("Não foi possível reativar assignment Supabase.");
  }

  const { data, error } = await client
    .from("caregiver_assignments")
    .insert({
      id: randomUUID(),
      patient_id: patientId,
      caregiver_user_id: caregiverUserId,
      start_date: input.start_date,
      active: true,
    })
    .select("*")
    .single();
  if (isAssignmentUniqueViolation(error)) {
    throw new AssignmentConflictError("duplicate_assignment", ASSIGNMENT_DUPLICATE_CONFLICT_MESSAGE);
  }
  return mapAssignment(requireValue("Não foi possível criar assignment Supabase", data as SupabaseRow | null, error));
}

export async function deactivateAssignment(id: string): Promise<void> {
  const client = await requestClient();
  const { error } = await client
    .from("caregiver_assignments")
    .update({ active: false, end_date: new Date().toISOString().slice(0, 10) })
    .eq("id", assertUuid(id, "Assignment"));
  requireNoError("Não foi possível desativar assignment Supabase", error);
}

export async function isCaregiverAssignedToPatient(caregiverUserId: string, patientId: string): Promise<boolean> {
  const client = await requestClient();
  const { data, error } = await client
    .from("caregiver_assignments")
    .select("id")
    .eq("caregiver_user_id", assertUuid(caregiverUserId, "Cuidador"))
    .eq("patient_id", assertUuid(patientId, "Paciente"))
    .eq("active", true)
    .limit(1);
  requireNoError("Não foi possível verificar assignment Supabase", error);
  return ((data || []) as SupabaseRow[]).length > 0;
}

// ---------- Leads ----------
export async function listLeads(): Promise<Lead[]> {
  const client = await requestClient();
  const { data, error } = await client.from("leads").select("*").order("created_at", { ascending: false });
  requireNoError("Não foi possível listar leads Supabase", error);
  return ((data || []) as SupabaseRow[]).map(mapLead);
}

export async function createLead(input: {
  name: string;
  email: string;
  phone: string;
  patient_name?: string;
  care_type?: string;
  message?: string;
}): Promise<Lead> {
  const client = serviceClient();
  const { data, error } = await client
    .from("leads")
    .insert({
      id: randomUUID(),
      name: input.name,
      email: input.email.trim().toLowerCase(),
      phone: input.phone,
      patient_name: input.patient_name || null,
      care_type: input.care_type || null,
      message: input.message || null,
      status: "novo",
    })
    .select("*")
    .single();
  return mapLead(requireValue("Não foi possível criar lead Supabase", data as SupabaseRow | null, error));
}

export async function updateLeadStatus(id: string, status: Lead["status"]): Promise<void> {
  const client = await requestClient();
  const { error } = await client
    .from("leads")
    .update({ status })
    .eq("id", assertUuid(id, "Lead"));
  requireNoError("Não foi possível atualizar status do lead Supabase", error);
}

export async function deleteLead(id: string): Promise<void> {
  const client = await requestClient();
  const { error } = await client.from("leads").delete().eq("id", assertUuid(id, "Lead"));
  requireNoError("Não foi possível excluir lead Supabase", error);
}

// ---------- Professional applications ----------
export async function listProfessionalApplications(): Promise<ProfessionalApplication[]> {
  const client = await requestClient();
  const { data, error } = await client
    .from("professional_applications")
    .select("*")
    .order("created_at", { ascending: false });
  requireNoError("Não foi possível listar candidaturas Supabase", error);
  return ((data || []) as SupabaseRow[]).map(mapProfessionalApplication);
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
  const client = serviceClient();
  const { data, error } = await client
    .from("professional_applications")
    .insert({
      id: randomUUID(),
      name: input.name,
      email: input.email.trim().toLowerCase(),
      phone: input.phone,
      city: input.city || null,
      profession: input.profession,
      coren: input.coren || null,
      experience: input.experience || null,
      availability_days: input.availability_days,
      availability_shifts: input.availability_shifts,
      available_from: input.available_from || null,
      notes: input.notes || null,
      status: "novo",
      lgpd_consent: input.lgpd_consent,
      lgpd_consent_at: new Date().toISOString(),
      privacy_notice_version: input.privacy_notice_version,
    })
    .select("*")
    .single();
  return mapProfessionalApplication(
    requireValue("Não foi possível criar candidatura Supabase", data as SupabaseRow | null, error),
  );
}

export async function updateProfessionalApplicationStatus(
  id: string,
  status: ProfessionalApplication["status"],
  reviewedBy: string,
): Promise<void> {
  const client = await requestClient();
  const applicationId = assertUuid(id, "Candidatura");
  const reviewerId = assertUuid(reviewedBy, "Revisor");
  if (status === "aprovado") {
    const { data: application, error: applicationError } = await client
      .from("professional_applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();
    const app = requireValue(
      "Não foi possível consultar candidatura Supabase",
      application as SupabaseRow | null,
      applicationError,
    );
    const { error: updateError } = await client
      .from("professional_applications")
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: reviewerId })
      .eq("id", applicationId);
    requireNoError("Não foi possível aprovar candidatura Supabase", updateError);

    const { data: existing, error: existingError } = await client
      .from("caregiver_profiles")
      .select("*")
      .eq("application_id", applicationId)
      .maybeSingle();
    requireNoError("Não foi possível consultar perfil profissional Supabase", existingError);
    const existingRow = existing as SupabaseRow | null;
    const caregiverRow = {
      id: asString(existingRow?.id) || randomUUID(),
      application_id: applicationId,
      name: asString(app.name),
      contact_email: asString(app.email),
      phone: asString(app.phone),
      city: asNullableString(app.city),
      profession: asProfession(app.profession),
      coren: asNullableString(app.coren),
      experience: asNullableString(app.experience),
      availability_days: asStringArray(app.availability_days),
      availability_shifts: asStringArray(app.availability_shifts),
      available_from: asNullableString(app.available_from),
      notes: asNullableString(app.notes),
      account_status: existingRow && asNullableString(existingRow.user_id)
        ? asCaregiverStatus(existingRow.account_status)
        : "aguardando_acesso",
      approved_at: asString(existingRow?.approved_at) || new Date().toISOString(),
    };
    const { error: profileError } = await client
      .from("caregiver_profiles")
      .upsert(caregiverRow, { onConflict: "application_id" });
    requireNoError("Não foi possível criar perfil profissional Supabase", profileError);
    return;
  }

  const { error } = await client
    .from("professional_applications")
    .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: reviewerId })
    .eq("id", applicationId);
  requireNoError("Não foi possível atualizar candidatura Supabase", error);
  if (status === "recusado") {
    const { error: profileError } = await client
      .from("caregiver_profiles")
      .update({ account_status: "inativo" })
      .eq("application_id", applicationId);
    requireNoError("Não foi possível inativar perfil profissional Supabase", profileError);
  }
}

export async function deleteProfessionalApplication(id: string): Promise<void> {
  const client = await requestClient();
  const { error } = await client
    .from("professional_applications")
    .delete()
    .eq("id", assertUuid(id, "Candidatura"));
  requireNoError("Não foi possível excluir candidatura Supabase", error);
}

// ---------- Caregiver bank ----------
async function caregiverRows(query: PromiseLike<{ data: unknown; error: unknown }>): Promise<CaregiverProfile[]> {
  const result = await query;
  requireNoError("Não foi possível consultar perfis de cuidadores Supabase", result.error);
  const rows = (result.data || []) as SupabaseRow[];
  const userIds = rows
    .map((row) => asNullableString(row.user_id))
    .filter((id): id is string => Boolean(id));
  const authRows = userIds.length ? await profilesWithAuth(userIds) : [];
  const emails = new Map(
    authRows.map(({ profile, authUser }) => [asString(profile.id), authUser?.email || null]),
  );
  return rows.map((row) => mapCaregiverProfile(row, emails.get(asString(row.user_id))));
}

export async function listCaregiverProfiles(): Promise<CaregiverProfile[]> {
  const client = await requestClient();
  return caregiverRows(client.from("caregiver_profiles").select("*").order("approved_at", { ascending: false }).order("name"));
}

export async function getCaregiverProfile(id: string): Promise<CaregiverProfile | undefined> {
  const client = await requestClient();
  const result = await client.from("caregiver_profiles").select("*").eq("id", assertUuid(id, "Perfil de cuidador")).maybeSingle();
  requireNoError("Não foi possível consultar perfil de cuidador Supabase", result.error);
  if (!result.data) return undefined;
  const row = result.data as SupabaseRow;
  const authRows = row.user_id ? await profilesWithAuth([asString(row.user_id)]) : [];
  return mapCaregiverProfile(row, authRows[0]?.authUser?.email || null);
}

export async function getCaregiverProfileByUserId(userId: string): Promise<CaregiverProfile | undefined> {
  const client = await requestClient();
  const result = await client
    .from("caregiver_profiles")
    .select("*")
    .eq("user_id", assertUuid(userId, "Cuidador"))
    .maybeSingle();
  requireNoError("Não foi possível consultar perfil do cuidador Supabase", result.error);
  if (!result.data) return undefined;
  const row = result.data as SupabaseRow;
  const authRows = row.user_id ? await profilesWithAuth([asString(row.user_id)]) : [];
  return mapCaregiverProfile(row, authRows[0]?.authUser?.email || null);
}

export async function createCaregiverAccess(input: {
  profileId: string;
  email: string;
  password: string;
}): Promise<User> {
  const client = serviceClient();
  const profileId = assertUuid(input.profileId, "Perfil de cuidador");
  const { data: profile, error: profileError } = await client
    .from("caregiver_profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();
  requireNoError("Não foi possível consultar perfil de cuidador Supabase", profileError);
  const row = profile as SupabaseRow | null;
  if (!row || row.user_id || asString(row.account_status) !== "aguardando_acesso") {
    throw new SupabaseDataError("Perfil não encontrado ou acesso já criado.");
  }
  if (await activeAuthUserByEmail(input.email)) {
    throw new SupabaseDataError("Este e-mail já está vinculado a outra conta.");
  }
  const user = await createAuthProfile(client, {
    name: asString(row.name),
    email: input.email,
    password: input.password,
    role: "cuidador",
    phone: asNullableString(row.phone) || undefined,
  });
  const { error: updateError } = await client
    .from("caregiver_profiles")
    .update({ user_id: user.id, account_status: "ativo" })
    .eq("id", profileId)
    .is("user_id", null)
    .eq("account_status", "aguardando_acesso");
  if (updateError) {
    await client.auth.admin.deleteUser(user.id).catch(() => undefined);
    throw operationError("Não foi possível vincular acesso ao perfil Supabase", updateError);
  }
  return user;
}

export async function deleteCaregiverProfile(id: string): Promise<void> {
  const client = serviceClient();
  const profileId = assertUuid(id, "Perfil de cuidador");
  const { data: profile, error: profileError } = await client
    .from("caregiver_profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();
  requireNoError("Não foi possível consultar perfil de cuidador Supabase", profileError);
  if (!profile) return;
  const row = profile as SupabaseRow;
  const userId = asNullableString(row.user_id);
  const keys = await contractKeys(client, "caregiver_profile_id", profileId);
  if (userId) keys.push(...(await contractKeys(client, "caregiver_user_id", userId)));
  const { error: contractError } = await client.from("contract_documents").delete().or(`caregiver_profile_id.eq.${profileId}${userId ? `,caregiver_user_id.eq.${userId}` : ""}`);
  requireNoError("Não foi possível excluir contratos do perfil Supabase", contractError);
  if (userId) {
    const { error: assignmentError } = await client.from("caregiver_assignments").delete().eq("caregiver_user_id", userId);
    requireNoError("Não foi possível excluir assignments do cuidador Supabase", assignmentError);
  }
  const { error: deleteError } = await client.from("caregiver_profiles").delete().eq("id", profileId);
  requireNoError("Não foi possível excluir perfil de cuidador Supabase", deleteError);
  if (userId) await deactivateProfile(client, userId, "Profissional removido");
  await cleanupContracts(keys);
}

export async function deleteCaregiverUser(id: string): Promise<void> {
  const client = serviceClient();
  const userId = assertUuid(id, "Cuidador");
  const keys = await contractKeys(client, "caregiver_user_id", userId);
  const { error: contractError } = await client.from("contract_documents").delete().eq("caregiver_user_id", userId);
  requireNoError("Não foi possível excluir contratos do cuidador Supabase", contractError);
  const { error: assignmentError } = await client.from("caregiver_assignments").delete().eq("caregiver_user_id", userId);
  requireNoError("Não foi possível excluir assignments do cuidador Supabase", assignmentError);
  const { error: caregiverError } = await client
    .from("caregiver_profiles")
    .update({ user_id: null, account_status: "inativo" })
    .eq("user_id", userId);
  requireNoError("Não foi possível desassociar perfil do cuidador Supabase", caregiverError);
  await deactivateProfile(client, userId, "Profissional removido");
  await cleanupContracts(keys);
}

export async function deleteFamilyUser(id: string): Promise<void> {
  const client = serviceClient();
  const userId = assertUuid(id, "Família");
  const keys = await contractKeys(client, "family_user_id", userId);
  const { error: patientError } = await client.from("patients").update({ family_user_id: null }).eq("family_user_id", userId);
  requireNoError("Não foi possível desvincular pacientes da família Supabase", patientError);
  const { error: contractError } = await client.from("contract_documents").delete().eq("family_user_id", userId);
  requireNoError("Não foi possível excluir contratos da família Supabase", contractError);
  await deactivateProfile(client, userId, "Conta de família removida");
  await cleanupContracts(keys);
}

// ---------- Contract documents ----------
function contractColumn(ownerType: ContractOwnerType): "family_user_id" | "caregiver_profile_id" | "caregiver_user_id" {
  if (ownerType === "family") return "family_user_id";
  if (ownerType === "caregiver_profile") return "caregiver_profile_id";
  return "caregiver_user_id";
}

export async function listContractDocuments(ownerType: ContractOwnerType, ownerId: string): Promise<ContractDocument[]> {
  const client = await requestClient();
  const column = contractColumn(ownerType);
  const { data, error } = await client
    .from("contract_documents")
    .select("id, family_user_id, caregiver_profile_id, caregiver_user_id, file_name, mime_type, file_size, uploaded_by, created_at")
    .eq(column, assertUuid(ownerId, "Proprietário do contrato"))
    .order("created_at", { ascending: false });
  requireNoError("Não foi possível listar contratos Supabase", error);
  return ((data || []) as SupabaseRow[]).map(mapContract);
}

export async function listContractDocumentsForCaregiver(userId: string): Promise<ContractDocument[]> {
  const client = await requestClient();
  const caregiverId = assertUuid(userId, "Cuidador");
  const { data: profiles, error: profileError } = await client
    .from("caregiver_profiles")
    .select("id")
    .eq("user_id", caregiverId);
  requireNoError("Não foi possível consultar perfis do cuidador Supabase", profileError);
  const profileIds = ((profiles || []) as SupabaseRow[])
    .map((row) => asNullableString(row.id))
    .filter((id): id is string => Boolean(id));
  const ownership = [`caregiver_user_id.eq.${caregiverId}`];
  if (profileIds.length) ownership.push(`caregiver_profile_id.in.(${profileIds.join(",")})`);
  const { data, error } = await client
    .from("contract_documents")
    .select("id, family_user_id, caregiver_profile_id, caregiver_user_id, file_name, mime_type, file_size, uploaded_by, created_at")
    .or(ownership.join(","))
    .order("created_at", { ascending: false });
  requireNoError("Não foi possível listar contratos do cuidador Supabase", error);
  return ((data || []) as SupabaseRow[]).map(mapContract);
}

export async function getContractDocument(id: string): Promise<ContractDocument | undefined> {
  const client = await requestClient();
  const { data, error } = await client
    .from("contract_documents")
    .select("id, family_user_id, caregiver_profile_id, caregiver_user_id, file_name, mime_type, file_size, uploaded_by, created_at")
    .eq("id", assertUuid(id, "Contrato"))
    .maybeSingle();
  requireNoError("Não foi possível consultar contrato Supabase", error);
  return data ? mapContract(data as SupabaseRow) : undefined;
}

export async function getContractFileData(id: string): Promise<Uint8Array | null> {
  const client = await requestClient();
  const { data, error } = await client
    .from("contract_documents")
    .select("storage_key")
    .eq("id", assertUuid(id, "Contrato"))
    .maybeSingle();
  requireNoError("Não foi possível consultar arquivo de contrato Supabase", error);
  const key = asNullableString((data as SupabaseRow | null)?.storage_key);
  if (!key) return null;
  storageEnabled();
  return getStoredFile(key);
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
  const client = await requestClient();
  storageEnabled();
  const id = randomUUID();
  const storageKey = `contracts/${id}.pdf`;
  const column = contractColumn(input.ownerType);
  const ownerId = assertUuid(input.ownerId, "Proprietário do contrato");
  const uploadedBy = assertUuid(input.uploadedBy, "Autor do upload");
  await putStoredFile(storageKey, input.fileData, input.mimeType);
  const { data, error } = await client
    .from("contract_documents")
    .insert({
      id,
      family_user_id: column === "family_user_id" ? ownerId : null,
      caregiver_profile_id: column === "caregiver_profile_id" ? ownerId : null,
      caregiver_user_id: column === "caregiver_user_id" ? ownerId : null,
      file_name: input.fileName,
      mime_type: input.mimeType,
      file_size: input.fileSize,
      storage_key: storageKey,
      uploaded_by: uploadedBy,
    })
    .select("id, family_user_id, caregiver_profile_id, caregiver_user_id, file_name, mime_type, file_size, uploaded_by, created_at")
    .single();
  if (error || !data) {
    await deleteStoredFile(storageKey).catch(() => undefined);
    throw operationError("Não foi possível criar metadados do contrato Supabase", error);
  }
  return mapContract(data as SupabaseRow);
}

export async function deleteContractDocument(id: string): Promise<void> {
  const client = await requestClient();
  const contractId = assertUuid(id, "Contrato");
  const { data, error } = await client
    .from("contract_documents")
    .select("storage_key")
    .eq("id", contractId)
    .maybeSingle();
  requireNoError("Não foi possível consultar contrato Supabase", error);
  const key = asNullableString((data as SupabaseRow | null)?.storage_key);
  const { error: deleteError } = await client.from("contract_documents").delete().eq("id", contractId);
  requireNoError("Não foi possível excluir contrato Supabase", deleteError);
  if (key) await cleanupContracts([key]);
}

// ---------- Daily records ----------
export async function listRecordsForPatient(patientId: string, limit = 90): Promise<DailyRecord[]> {
  const client = await requestClient();
  const { data, error } = await client
    .from("daily_records")
    .select("*")
    .eq("patient_id", assertUuid(patientId, "Paciente"))
    .order("record_date", { ascending: false })
    .order("record_time", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 365)));
  requireNoError("Não foi possível listar registros diários Supabase", error);
  return hydratePhotos((data || []) as SupabaseRow[]);
}

export async function getRecord(id: string): Promise<DailyRecord | undefined> {
  const client = await requestClient();
  const { data, error } = await client.from("daily_records").select("*").eq("id", assertUuid(id, "Registro")).maybeSingle();
  requireNoError("Não foi possível consultar registro diário Supabase", error);
  return data ? hydratePhoto(mapDailyRecord(data as SupabaseRow), data as SupabaseRow) : undefined;
}

export async function getRecordForCaregiverOnDate(
  patientId: string,
  caregiverUserId: string,
  recordDate: string,
): Promise<DailyRecord | undefined> {
  const client = await requestClient();
  const { data, error } = await client
    .from("daily_records")
    .select("*")
    .eq("patient_id", assertUuid(patientId, "Paciente"))
    .eq("caregiver_user_id", assertUuid(caregiverUserId, "Cuidador"))
    .eq("record_date", recordDate)
    .order("record_time", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1);
  requireNoError("Não foi possível consultar registro diário Supabase", error);
  const row = ((data || []) as SupabaseRow[])[0];
  return row ? hydratePhoto(mapDailyRecord(row), row) : undefined;
}

export async function createRecord(
  input: Omit<DailyRecord, "id" | "created_at" | "updated_at">,
  actor: RecordAuditActor = { userId: input.caregiver_user_id, name: "Cuidador" },
): Promise<DailyRecord> {
  const client = await requestClient();
  // Audit inserts are intentionally service-role-only in DB-02; resolve the
  // service client before writing the record so a missing secret fails closed.
  const auditClient = serviceClient();
  const id = randomUUID();
  assertUuid(input.patient_id, "Paciente");
  assertUuid(input.caregiver_user_id, "Cuidador");
  assertUuid(actor.userId, "Autor da auditoria");
  let photoKey: string | null = null;
  const row = {
    id,
    patient_id: input.patient_id,
    caregiver_user_id: input.caregiver_user_id,
    record_date: input.record_date,
    record_time: input.record_time,
    bp_systolic: input.bp_systolic,
    bp_diastolic: input.bp_diastolic,
    heart_rate: input.heart_rate,
    temperature: input.temperature,
    spo2: input.spo2,
    glucose: input.glucose,
    medications: input.medications,
    feeding: input.feeding,
    hygiene: input.hygiene,
    mobility: input.mobility,
    mood: input.mood,
    pain_level: input.pain_level,
    notes: input.notes,
    incident: input.incident === 1,
    incident_description: input.incident_description,
    // The Storage INSERT policy relates the object to an existing record, so
    // the row is created first and linked to its object immediately after.
    photo_storage_key: null,
  };
  const { data: insertedData, error } = await client.from("daily_records").insert(row).select("*").single();
  if (error || !insertedData) {
    throw operationError("Não foi possível criar registro diário Supabase", error);
  }
  let persistedData = insertedData as SupabaseRow;
  try {
    if (input.photo_data) {
      photoKey = await uploadRecordPhoto(input.patient_id, id, input.photo_data);
      const { data: linkedData, error: linkError } = await client
        .from("daily_records")
        .update({ photo_storage_key: photoKey })
        .eq("id", id)
        .select("*")
        .single();
      if (linkError || !linkedData) throw operationError("Não foi possível vincular foto ao registro Supabase", linkError);
      persistedData = linkedData as SupabaseRow;
    }
  } catch (error) {
    if (photoKey) await deleteStoredFile(photoKey).catch(() => undefined);
    try {
      await auditClient.from("daily_records").delete().eq("id", id);
    } catch {
      // Keep the original upload/link error as the operation result.
    }
    throw error;
  }
  const snapshot = snapshotDailyRecord(input);
  const { error: auditError } = await auditClient.from("daily_record_audit_events").insert({
    id: randomUUID(),
    record_id: id,
    patient_id: input.patient_id,
    actor_user_id: actor.userId,
    actor_name: actor.name.slice(0, 160),
    action: "created",
    changed_fields: Object.keys(snapshot),
    after_data: snapshot,
  });
  if (auditError) {
    try {
      await auditClient.from("daily_records").delete().eq("id", id);
    } catch {
      // Keep the original audit error as the operation result.
    }
    if (photoKey) await deleteStoredFile(photoKey).catch(() => undefined);
    throw operationError("Não foi possível registrar auditoria do registro Supabase", auditError);
  }
  return hydratePhoto(mapDailyRecord(persistedData), persistedData);
}

export async function updateRecord(
  id: string,
  fields: Partial<Omit<DailyRecord, "id" | "created_at" | "updated_at" | "patient_id" | "caregiver_user_id">>,
  actor: RecordAuditActor,
): Promise<DailyRecord | undefined> {
  const client = await requestClient();
  const auditClient = serviceClient();
  const recordId = assertUuid(id, "Registro");
  const { data: existingData, error: existingError } = await client
    .from("daily_records")
    .select("*")
    .eq("id", recordId)
    .maybeSingle();
  requireNoError("Não foi possível consultar registro diário Supabase", existingError);
  if (!existingData) return undefined;
  const existingRow = existingData as SupabaseRow;
  const existing = await hydratePhoto(mapDailyRecord(existingRow), existingRow);
  const merged = { ...existing, ...fields };
  const changedFields = diffDailyRecord(existing, merged);
  if (!changedFields.length) return existing;
  assertUuid(actor.userId, "Autor da auditoria");

  let newPhotoKey = asNullableString(existingRow.photo_storage_key);
  let uploadedPhotoKey: string | null = null;
  if ("photo_data" in fields) {
    if (fields.photo_data) {
      uploadedPhotoKey = await uploadRecordPhoto(existing.patient_id, recordId, fields.photo_data);
      newPhotoKey = uploadedPhotoKey;
    } else {
      storageEnabled();
      newPhotoKey = null;
    }
  }
  const update: SupabaseRow = {};
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
  ] as const;
  for (const key of allowed) {
    if (key in fields) update[key] = key === "incident" ? fields[key] === 1 : fields[key] ?? null;
  }
  if ("photo_data" in fields) update.photo_storage_key = newPhotoKey;
  update.updated_at = new Date().toISOString();
  const { data: updatedData, error: updateError } = await client
    .from("daily_records")
    .update(update)
    .eq("id", recordId)
    .select("*")
    .single();
  if (updateError || !updatedData) {
    if (uploadedPhotoKey) await deleteStoredFile(uploadedPhotoKey).catch(() => undefined);
    throw operationError("Não foi possível atualizar registro diário Supabase", updateError);
  }
  const { error: auditError } = await auditClient.from("daily_record_audit_events").insert({
    id: randomUUID(),
    record_id: recordId,
    patient_id: existing.patient_id,
    actor_user_id: actor.userId,
    actor_name: actor.name.slice(0, 160),
    action: "updated",
    changed_fields: changedFields,
    before_data: snapshotDailyRecord(existing),
    after_data: snapshotDailyRecord(merged),
  });
  if (auditError) {
    try {
      await client.from("daily_records").update({
        ...Object.fromEntries(allowed.filter((key) => key in existing).map((key) => [key, key === "incident" ? existing[key] === 1 : existing[key] ?? null])),
        photo_storage_key: existingRow.photo_storage_key ?? null,
        updated_at: existing.updated_at,
      }).eq("id", recordId);
    } catch {
      // Keep the original audit error as the operation result.
    }
    if (uploadedPhotoKey) await deleteStoredFile(uploadedPhotoKey).catch(() => undefined);
    throw operationError("Não foi possível registrar auditoria da atualização Supabase", auditError);
  }
  const oldPhotoKey = asNullableString(existingRow.photo_storage_key);
  if (oldPhotoKey && oldPhotoKey !== newPhotoKey) await deleteStoredFile(oldPhotoKey).catch(() => undefined);
  return hydratePhoto(mapDailyRecord(updatedData as SupabaseRow), updatedData as SupabaseRow);
}

export async function listRecordAuditForPatient(patientId: string, limit = 50): Promise<DailyRecordAuditEvent[]> {
  const client = await requestClient();
  const { data, error } = await client
    .from("daily_record_audit_events")
    .select("*")
    .eq("patient_id", assertUuid(patientId, "Paciente"))
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 200)));
  requireNoError("Não foi possível listar auditoria Supabase", error);
  return ((data || []) as SupabaseRow[]).map(mapAuditEvent);
}

export async function countPendingLeads(): Promise<number> {
  const client = await requestClient();
  const { count, error } = await client
    .from("leads")
    .select("id", { count: "exact", head: true })
    .in("status", ["novo", "em_contato"]);
  requireNoError("Não foi possível contar leads pendentes Supabase", error);
  return count || 0;
}

export async function getCaregiverName(id: string): Promise<string> {
  const user = await getUserById(assertUuid(id, "Cuidador"));
  return user?.name || "Cuidador";
}

export async function getCaregiverNamesMap(ids: string[]): Promise<Record<string, string>> {
  const users = await getUsersByIds([...new Set(ids)]);
  return Object.fromEntries(users.map((user) => [user.id, user.name]));
}
