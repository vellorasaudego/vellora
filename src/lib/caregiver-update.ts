import type { CaregiverProfileUpdate, CaregiverUserUpdate } from "./data";
import { isValidEmail, isValidIsoDate, normalizedPhoneDigits } from "./validation";

const VALID_PROFESSIONS = new Set(["cuidador", "tecnico_enfermagem", "enfermeiro", "outros"]);
const VALID_DAYS = new Set(["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"]);
const VALID_SHIFTS = new Set([
  "manha",
  "tarde",
  "noite",
  "plantao_12h_diurno",
  "plantao_12h_noturno",
  "plantao_24h",
]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PROFILE_FIELDS = new Set([
  "name",
  "contact_email",
  "phone",
  "city",
  "profession",
  "coren",
  "experience",
  "availability_days",
  "availability_shifts",
  "available_from",
  "notes",
]);
const USER_FIELDS = new Set(["name", "phone"]);

export type ParseUpdateResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectUnknownFields(body: Record<string, unknown>, allowed: Set<string>): string | null {
  const unknown = Object.keys(body).filter((key) => !allowed.has(key));
  return unknown.length ? `Campo não permitido para edição: ${unknown.join(", ")}.` : null;
}

function parseRequiredText(value: unknown, label: string, maxLength: number): ParseUpdateResult<string> {
  if (typeof value !== "string") return { ok: false, error: `${label} deve ser um texto.` };
  const normalized = value.trim();
  if (!normalized) return { ok: false, error: `${label} não pode ficar vazio.` };
  if (normalized.length > maxLength) return { ok: false, error: `${label} deve ter no máximo ${maxLength} caracteres.` };
  return { ok: true, value: normalized };
}

function parseNullableText(value: unknown, label: string, maxLength: number): ParseUpdateResult<string | null> {
  if (value === null || value === "") return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, error: `${label} deve ser um texto.` };
  const normalized = value.trim();
  if (normalized.length > maxLength) return { ok: false, error: `${label} deve ter no máximo ${maxLength} caracteres.` };
  return { ok: true, value: normalized || null };
}

function parsePhone(value: unknown, label: string, allowEmpty: boolean): ParseUpdateResult<string | null> {
  if (allowEmpty && (value === null || value === "")) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, error: `${label} deve ser um texto.` };
  const normalized = value.trim();
  const digits = normalizedPhoneDigits(normalized);
  if (digits.length < 10 || digits.length > 15) return { ok: false, error: `${label} deve conter entre 10 e 15 dígitos.` };
  return { ok: true, value: normalized };
}

function parseSelection(value: unknown, label: string, allowed: Set<string>, maxItems: number): ParseUpdateResult<string[]> {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    return { ok: false, error: `${label} deve ser uma lista válida.` };
  }
  const items = value.map((item) => item.trim());
  if (items.length > maxItems || new Set(items).size !== items.length || items.some((item) => !allowed.has(item))) {
    return { ok: false, error: `${label} contém uma opção inválida.` };
  }
  return { ok: true, value: items };
}

export function isValidCaregiverId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function parseCaregiverProfileUpdate(body: unknown): ParseUpdateResult<CaregiverProfileUpdate> {
  if (!isRecord(body)) return { ok: false, error: "Corpo inválido." };
  const unknownError = rejectUnknownFields(body, PROFILE_FIELDS);
  if (unknownError) return { ok: false, error: unknownError };
  if (!Object.keys(body).length) return { ok: false, error: "Informe ao menos um campo para editar." };

  const value: CaregiverProfileUpdate = {};
  if ("name" in body) {
    const result = parseRequiredText(body.name, "Nome", 120);
    if (!result.ok) return result;
    value.name = result.value;
  }
  if ("contact_email" in body) {
    const result = parseRequiredText(body.contact_email, "E-mail de contato", 254);
    if (!result.ok) return result;
    if (!isValidEmail(result.value)) return { ok: false, error: "Informe um e-mail de contato válido." };
    value.contact_email = result.value.toLowerCase();
  }
  if ("phone" in body) {
    const result = parsePhone(body.phone, "Telefone", false);
    if (!result.ok || result.value === null) return { ok: false, error: result.ok ? "Telefone não pode ficar vazio." : result.error };
    value.phone = result.value;
  }
  if ("city" in body) {
    const result = parseNullableText(body.city, "Cidade", 100);
    if (!result.ok) return result;
    value.city = result.value;
  }
  if ("profession" in body) {
    if (typeof body.profession !== "string" || !VALID_PROFESSIONS.has(body.profession)) {
      return { ok: false, error: "Profissão inválida." };
    }
    value.profession = body.profession as CaregiverProfileUpdate["profession"];
  }
  if ("coren" in body) {
    const result = parseNullableText(body.coren, "COREN", 40);
    if (!result.ok) return result;
    value.coren = result.value;
  }
  if ("experience" in body) {
    const result = parseNullableText(body.experience, "Experiência", 2_000);
    if (!result.ok) return result;
    value.experience = result.value;
  }
  if ("availability_days" in body) {
    const result = parseSelection(body.availability_days, "Dias disponíveis", VALID_DAYS, 7);
    if (!result.ok) return result;
    value.availability_days = result.value;
  }
  if ("availability_shifts" in body) {
    const result = parseSelection(body.availability_shifts, "Turnos disponíveis", VALID_SHIFTS, 6);
    if (!result.ok) return result;
    value.availability_shifts = result.value;
  }
  if ("available_from" in body) {
    const result = parseNullableText(body.available_from, "Data inicial", 10);
    if (!result.ok) return result;
    if (result.value && !isValidIsoDate(result.value)) return { ok: false, error: "Informe uma data inicial válida." };
    value.available_from = result.value;
  }
  if ("notes" in body) {
    const result = parseNullableText(body.notes, "Observações", 2_000);
    if (!result.ok) return result;
    value.notes = result.value;
  }
  return { ok: true, value };
}

export function parseCaregiverUserUpdate(body: unknown): ParseUpdateResult<CaregiverUserUpdate> {
  if (!isRecord(body)) return { ok: false, error: "Corpo inválido." };
  const unknownError = rejectUnknownFields(body, USER_FIELDS);
  if (unknownError) return { ok: false, error: unknownError };
  if (!Object.keys(body).length) return { ok: false, error: "Informe ao menos um campo para editar." };

  const value: CaregiverUserUpdate = {};
  if ("name" in body) {
    const result = parseRequiredText(body.name, "Nome", 120);
    if (!result.ok) return result;
    value.name = result.value;
  }
  if ("phone" in body) {
    const result = parsePhone(body.phone, "Telefone", true);
    if (!result.ok) return result;
    value.phone = result.value;
  }
  return { ok: true, value };
}
