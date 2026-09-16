import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./server";
import { runtimeValue } from "../runtime-config";
import {
  assertStorageContentType,
  assertStoragePath,
  classifyStoragePath,
  maxBytesForStoragePath,
  type StorageObjectPath,
} from "./storage-paths";

const SIGNED_UPLOAD_TTL_MS = 2 * 60 * 60 * 1000;
const PENDING_LIST_PAGE_SIZE = 1000;

export type SupabaseSignedUpload = {
  uploadEndpoint: string;
  token: string;
  expiresAt: string;
};

export type SupabaseFileInspection = {
  bytes: Uint8Array;
  contentType: string | null;
  updatedAt?: string | null;
};

export type SupabasePendingFile = {
  path: string;
  updatedAt: string | null;
};

function storageErrorDetails(error: unknown): {
  status?: number;
  statusCode?: string;
  code?: string;
} {
  if (!error || typeof error !== "object") return {};
  const details = error as Record<string, unknown>;
  return {
    status: typeof details.status === "number" ? details.status : undefined,
    statusCode: typeof details.statusCode === "string" ? details.statusCode : undefined,
    code: typeof details.code === "string" ? details.code : undefined,
  };
}

function isMissingObject(error: unknown): boolean {
  const details = storageErrorDetails(error);
  return details.status === 404 || details.statusCode === "404" || details.code === "NoSuchKey";
}

async function storageClient(): Promise<SupabaseClient> {
  // This is the request-scoped publishable-key client. It carries the caller's
  // SSR cookies so Storage RLS, not application-provided role data, authorizes
  // each operation. No service/secret key is accepted here.
  return createSupabaseServerClient();
}

function assertServerOnly(): void {
  if (typeof window !== "undefined") {
    throw new Error("As operações administrativas de Storage só podem ser usadas no servidor.");
  }
}

function serviceClient(): SupabaseClient {
  assertServerOnly();

  const publicUrlKey = ["NEXT", "PUBLIC", "SUPABASE", "URL"].join("_");
  const secretKeyName = ["SUPABASE", "SECRET", "KEY"].join("_");
  const serviceRoleKeyName = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");
  const url = (runtimeValue("SUPABASE_URL") || runtimeValue(publicUrlKey))?.trim();
  const serviceKey = (
    runtimeValue(secretKeyName) || runtimeValue(serviceRoleKeyName)
  )?.trim();

  if (!url || !serviceKey) {
    throw new Error(
      "Configure a URL e a chave administrativa do Supabase somente no servidor para operações internas de Storage.",
    );
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("URL inválida");
    }
  } catch {
    throw new Error("SUPABASE_URL deve ser uma URL HTTP(S) válida.");
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function resumableUploadEndpoint(): string {
  const publicUrlKey = ["NEXT", "PUBLIC", "SUPABASE", "URL"].join("_");
  const value = (runtimeValue("SUPABASE_URL") || runtimeValue(publicUrlKey))?.trim();
  if (!value) throw new Error("Configure SUPABASE_URL para uploads resumíveis.");

  const url = new URL(value);
  const hostParts = url.hostname.split(".");
  if (hostParts.length >= 3 && hostParts[1] === "supabase" && hostParts[2] === "co") {
    url.hostname = `${hostParts[0]}.storage.supabase.co`;
  }
  url.pathname = "/storage/v1/upload/resumable";
  url.search = "";
  return url.toString();
}

function assertContractPendingPath(key: string) {
  const object = assertStoragePath(key);
  if (object.kind !== "contract" || !object.pending) {
    throw new Error("Uploads assinados só podem usar caminhos temporários de contratos.");
  }
  return object;
}

function assertContractMovePaths(fromKey: string, toKey: string) {
  const from = assertStoragePath(fromKey);
  const to = assertStoragePath(toKey);
  if (
    from.kind !== "contract" ||
    to.kind !== "contract" ||
    !from.pending ||
    to.pending ||
    from.contractId !== to.contractId
  ) {
    throw new Error("A movimentação deve promover um contrato temporário para o mesmo ID final.");
  }
  return { from, to };
}

function validateUpload(object: StorageObjectPath, bytes: Uint8Array, contentType: string): string {
  if (bytes.byteLength <= 0 || bytes.byteLength > maxBytesForStoragePath(object)) {
    throw new Error("O arquivo excede o limite permitido para este armazenamento.");
  }
  return assertStorageContentType(object, contentType);
}

export async function putSupabaseFile(
  key: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  assertServerOnly();
  const object = assertStoragePath(key);
  const normalizedContentType = validateUpload(object, bytes, contentType);
  const client = await storageClient();
  const { error } = await client.storage.from(object.bucket).upload(object.path, bytes, {
    contentType: normalizedContentType,
    upsert: true,
  });
  if (error) throw error;
}

/**
 * Creates a short-lived signed token for a pending contract object. The
 * request-scoped client enforces the caller Storage RLS policy. Only the TUS
 * endpoint, token and expiry are returned; the service role never leaves
 * this server module.
 */
export async function createSupabaseSignedUploadUrl(
  path: string,
  contentType: string,
): Promise<SupabaseSignedUpload> {
  assertServerOnly();
  const object = assertContractPendingPath(path);
  assertStorageContentType(object, contentType);

  const client = await storageClient();
  const { data, error } = await client.storage
    .from(object.bucket)
    .createSignedUploadUrl(object.path, { upsert: false });
  if (error) throw error;

  return {
    uploadEndpoint: resumableUploadEndpoint(),
    token: data.token,
    expiresAt: new Date(Date.now() + SIGNED_UPLOAD_TTL_MS).toISOString(),
  };
}

export async function getSupabaseFile(key: string): Promise<Uint8Array | null> {
  assertServerOnly();
  const object = assertStoragePath(key);
  const client = await storageClient();
  const { data, error } = await client.storage.from(object.bucket).download(object.path);
  if (error) {
    if (isMissingObject(error)) return null;
    throw error;
  }
  if (!data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

/**
 * Reads a Storage object with the server-only client. A missing object returns
 * null; existing objects return their complete bytes and metadata needed for
 * finalization checks such as the PDF signature.
 */
export async function inspectSupabaseFile(
  path: string,
): Promise<SupabaseFileInspection | null> {
  assertServerOnly();
  const object = assertStoragePath(path);
  const storage = serviceClient().storage.from(object.bucket);
  const { data: info, error: infoError } = await storage.info(object.path);
  if (infoError) {
    if (isMissingObject(infoError)) return null;
    throw infoError;
  }

  const { data: file, error: downloadError } = await storage.download(object.path);
  if (downloadError) {
    if (isMissingObject(downloadError)) return null;
    throw downloadError;
  }
  if (!file) return null;

  const metadata = info.metadata as Record<string, unknown> | null | undefined;
  return {
    bytes: new Uint8Array(await file.arrayBuffer()),
    contentType:
      typeof info.contentType === "string"
        ? info.contentType
        : typeof metadata?.mimetype === "string"
          ? metadata.mimetype
          : typeof metadata?.contentType === "string"
            ? metadata.contentType
            : null,
    updatedAt: info.lastModified ?? info.updatedAt ?? null,
  };
}

/** Moves a pending contract to its matching final object using the server client. */
export async function moveSupabaseFile(fromPath: string, toPath: string): Promise<void> {
  assertServerOnly();
  const { from, to } = assertContractMovePaths(fromPath, toPath);
  const { error } = await serviceClient().storage.from(from.bucket).move(from.path, to.path);
  if (error) throw error;
}

export async function deleteSupabaseFile(key: string): Promise<void> {
  assertServerOnly();
  const object = assertStoragePath(key);
  const client = await storageClient();
  const { error } = await client.storage.from(object.bucket).remove([object.path]);
  if (error) throw error;
}

/** Deletes a Storage object with service credentials for cleanup jobs. */
export async function deleteSupabaseFileWithServiceRole(key: string): Promise<void> {
  assertServerOnly();
  const object = assertStoragePath(key);
  const { error } = await serviceClient().storage.from(object.bucket).remove([object.path]);
  if (error) throw error;
}

export async function deleteSupabaseFiles(keys: string[]): Promise<void> {
  assertServerOnly();
  if (keys.length === 0) return;

  const objects = keys.map(assertStoragePath);
  const byBucket = new Map<StorageObjectPath["bucket"], string[]>();
  for (const object of objects) {
    const paths = byBucket.get(object.bucket) || [];
    paths.push(object.path);
    byBucket.set(object.bucket, paths);
  }

  const client = await storageClient();
  for (const [bucket, paths] of byBucket) {
    const { error } = await client.storage.from(bucket).remove(paths);
    if (error) throw error;
  }
}

/**
 * Lists only valid pending contract objects. The returned path is always the
 * full bucket-relative path expected by the other adapter helpers.
 */
export async function listSupabasePendingFiles(): Promise<SupabasePendingFile[]> {
  assertServerOnly();
  const files: SupabasePendingFile[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await serviceClient().storage.from("contracts").list("pending", {
      limit: PENDING_LIST_PAGE_SIZE,
      offset,
      sortBy: { column: "updated_at", order: "asc" },
    });
    if (error) throw error;

    for (const entry of data || []) {
      if (!entry.id || !entry.name) continue;
      const path = `contracts/pending/${entry.name}`;
      const parsed = classifyStoragePath(path);
      if (!parsed || parsed.kind !== "contract" || !parsed.pending) continue;
      files.push({ path, updatedAt: entry.updated_at ?? entry.created_at ?? null });
    }

    if (!data || data.length < PENDING_LIST_PAGE_SIZE) break;
    offset += PENDING_LIST_PAGE_SIZE;
  }

  return files;
}

/**
 * Removes stale pending objects while protecting any path already referenced
 * by a domain contract row. It returns only operational counters, never file
 * contents, tokens or signed URLs.
 */
export async function removeStaleSupabasePendingFiles(
  olderThan: Date,
): Promise<{ removed: number; skippedReferenced: number }> {
  assertServerOnly();
  const candidates = (await listSupabasePendingFiles()).filter((file) => {
    if (!file.updatedAt) return false;
    return new Date(file.updatedAt).getTime() < olderThan.getTime();
  });
  if (candidates.length === 0) return { removed: 0, skippedReferenced: 0 };

  const client = serviceClient();
  const { data: rows, error: queryError } = await client
    .from("contract_documents")
    .select("storage_key")
    .in("storage_key", candidates.map((file) => file.path));
  if (queryError) throw queryError;

  const referenced = new Set(
    (rows || [])
      .map((row) => (typeof row.storage_key === "string" ? row.storage_key : null))
      .filter((path): path is string => path !== null),
  );
  const safePaths = candidates
    .map((file) => file.path)
    .filter((path) => !referenced.has(path));

  let removed = 0;
  for (let index = 0; index < safePaths.length; index += 100) {
    const batch = safePaths.slice(index, index + 100);
    const { error } = await client.storage.from("contracts").remove(batch);
    if (error) throw error;
    removed += batch.length;
  }

  return { removed, skippedReferenced: candidates.length - safePaths.length };
}
