import { runtimeBinding, runtimeValue } from "./runtime-config";
import {
  deleteSupabaseFile,
  deleteSupabaseFiles,
  getSupabaseFile,
  putSupabaseFile,
} from "./supabase/storage";
import { resolveStorageProvider } from "./supabase/storage-config";

type R2ObjectBodyLike = {
  arrayBuffer(): Promise<ArrayBuffer>;
};

type R2BucketLike = {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBodyLike | null>;
  delete(key: string | string[]): Promise<void>;
};

function getBucket(): R2BucketLike {
  const bucket = runtimeBinding<R2BucketLike>("BUCKET");
  if (!bucket) throw new Error("O armazenamento de documentos do site não está disponível.");
  return bucket;
}

function isSupabaseStorageProvider(): boolean {
  return resolveStorageProvider(runtimeValue("VELLORA_STORAGE_PROVIDER")) === "supabase";
}

export async function putStoredFile(
  key: string,
  bytes: Uint8Array,
  contentType: string
): Promise<void> {
  if (isSupabaseStorageProvider()) {
    await putSupabaseFile(key, bytes, contentType);
    return;
  }
  await getBucket().put(key, bytes, { httpMetadata: { contentType } });
}

export async function getStoredFile(key: string): Promise<Uint8Array | null> {
  if (isSupabaseStorageProvider()) return getSupabaseFile(key);
  const object = await getBucket().get(key);
  if (!object) return null;
  return new Uint8Array(await object.arrayBuffer());
}

export async function deleteStoredFile(key: string): Promise<void> {
  if (isSupabaseStorageProvider()) {
    await deleteSupabaseFile(key);
    return;
  }
  await getBucket().delete(key);
}

export async function deleteStoredFiles(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  if (isSupabaseStorageProvider()) {
    await deleteSupabaseFiles(keys);
    return;
  }
  await getBucket().delete(keys);
}
