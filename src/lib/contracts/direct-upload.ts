import { jwtVerify, SignJWT } from "jose";
import { runtimeValue } from "@/lib/runtime-config";
import type { ContractOwnerType } from "@/lib/data";

// The product limit is 10 MB in decimal bytes, not 10 MiB.
export const CONTRACT_UPLOAD_MAX_BYTES = 10_000_000;
export const CONTRACT_LEGACY_MAX_BYTES = 4 * 1024 * 1024;
export const CONTRACT_UPLOAD_TICKET_TTL_SECONDS = 30 * 60;
export const CONTRACT_UPLOAD_PENDING_PREFIX = "contracts/pending/";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OWNER_TYPES: readonly ContractOwnerType[] = [
  "family",
  "caregiver_profile",
  "caregiver_user",
];

export type ContractUploadTicket = {
  uploadId: string;
  ownerType: ContractOwnerType;
  ownerId: string;
  fileName: string;
  fileSize: number;
  mimeType: "application/pdf";
  pendingPath: string;
  uploadedBy: string;
};

function ticketSecret(): Uint8Array {
  const secret = runtimeValue("VELLORA_SESSION_SECRET")?.trim();
  if (!secret) {
    throw new Error("Configure VELLORA_SESSION_SECRET antes de habilitar uploads diretos.");
  }
  return new TextEncoder().encode(secret);
}

export function isDirectContractUploadEnabled(): boolean {
  const value = runtimeValue("VELLORA_CONTRACT_DIRECT_UPLOAD")?.trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes" || value === "on";
}

export function isContractOwnerType(value: unknown): value is ContractOwnerType {
  return typeof value === "string" && OWNER_TYPES.includes(value as ContractOwnerType);
}

export function isContractUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function normalizeContractFileName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[\\/\r\n\u0000]/g, " ").trim();
  if (!normalized || normalized.length > 180 || !normalized.toLowerCase().endsWith(".pdf")) {
    return null;
  }
  return normalized;
}

export function validateContractUploadMetadata(input: {
  ownerType: unknown;
  ownerId: unknown;
  fileName: unknown;
  fileSize: unknown;
  mimeType: unknown;
}):
  | { ok: true; ownerType: ContractOwnerType; ownerId: string; fileName: string; fileSize: number }
  | { ok: false; error: string } {
  if (!isContractOwnerType(input.ownerType) || !isContractUuid(input.ownerId)) {
    return { ok: false, error: "Selecione um cadastro válido para o contrato." };
  }
  const fileName = normalizeContractFileName(input.fileName);
  if (!fileName) return { ok: false, error: "Informe um nome de arquivo PDF válido." };
  if (input.mimeType !== "application/pdf") {
    return { ok: false, error: "Envie somente arquivos PDF." };
  }
  if (
    typeof input.fileSize !== "number" ||
    !Number.isSafeInteger(input.fileSize) ||
    input.fileSize <= 0 ||
    input.fileSize > CONTRACT_UPLOAD_MAX_BYTES
  ) {
    return { ok: false, error: "O contrato deve ter no máximo 10 MB." };
  }
  return {
    ok: true,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    fileName,
    fileSize: input.fileSize,
  };
}

export async function createContractUploadTicket(ticket: ContractUploadTicket): Promise<string> {
  return new SignJWT({
    purpose: "vellora-contract-upload",
    uploadId: ticket.uploadId,
    ownerType: ticket.ownerType,
    ownerId: ticket.ownerId,
    fileName: ticket.fileName,
    fileSize: ticket.fileSize,
    mimeType: ticket.mimeType,
    pendingPath: ticket.pendingPath,
    uploadedBy: ticket.uploadedBy,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(ticket.uploadId)
    .setIssuedAt()
    .setExpirationTime(`${CONTRACT_UPLOAD_TICKET_TTL_SECONDS}s`)
    .sign(ticketSecret());
}

export async function verifyContractUploadTicket(value: unknown): Promise<ContractUploadTicket | null> {
  if (typeof value !== "string" || value.length < 80 || value.length > 4096) return null;
  try {
    const { payload } = await jwtVerify(value, ticketSecret(), { algorithms: ["HS256"] });
    if (
      payload.purpose !== "vellora-contract-upload" ||
      typeof payload.uploadId !== "string" ||
      !isContractUuid(payload.uploadId) ||
      payload.sub !== payload.uploadId ||
      !isContractOwnerType(payload.ownerType) ||
      !isContractUuid(payload.ownerId) ||
      typeof payload.fileName !== "string" ||
      typeof payload.fileSize !== "number" ||
      !Number.isSafeInteger(payload.fileSize) ||
      payload.fileSize <= 0 ||
      payload.fileSize > CONTRACT_UPLOAD_MAX_BYTES ||
      payload.mimeType !== "application/pdf" ||
      typeof payload.pendingPath !== "string" ||
      payload.pendingPath !== `${CONTRACT_UPLOAD_PENDING_PREFIX}${payload.uploadId}.pdf` ||
      typeof payload.uploadedBy !== "string" ||
      !isContractUuid(payload.uploadedBy)
    ) {
      return null;
    }
    const fileName = normalizeContractFileName(payload.fileName);
    if (!fileName) return null;
    return {
      uploadId: payload.uploadId,
      ownerType: payload.ownerType,
      ownerId: payload.ownerId,
      fileName,
      fileSize: payload.fileSize,
      mimeType: "application/pdf",
      pendingPath: payload.pendingPath,
      uploadedBy: payload.uploadedBy,
    };
  } catch {
    return null;
  }
}
