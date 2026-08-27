import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./server";
import {
  assertStorageContentType,
  assertStoragePath,
  maxBytesForStoragePath,
  type StorageObjectPath,
} from "./storage-paths";

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
  const object = assertStoragePath(key);
  const normalizedContentType = validateUpload(object, bytes, contentType);
  const client = await storageClient();
  const { error } = await client.storage.from(object.bucket).upload(object.path, bytes, {
    contentType: normalizedContentType,
    upsert: true,
  });
  if (error) throw error;
}

export async function getSupabaseFile(key: string): Promise<Uint8Array | null> {
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

export async function deleteSupabaseFile(key: string): Promise<void> {
  const object = assertStoragePath(key);
  const client = await storageClient();
  const { error } = await client.storage.from(object.bucket).remove([object.path]);
  if (error) throw error;
}

export async function deleteSupabaseFiles(keys: string[]): Promise<void> {
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
