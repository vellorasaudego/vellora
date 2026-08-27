import { env } from "cloudflare:workers";

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
  const bucket = (env as { BUCKET?: R2BucketLike }).BUCKET;
  if (!bucket) throw new Error("O armazenamento de documentos do site não está disponível.");
  return bucket;
}

export async function putStoredFile(
  key: string,
  bytes: Uint8Array,
  contentType: string
): Promise<void> {
  await getBucket().put(key, bytes, { httpMetadata: { contentType } });
}

export async function getStoredFile(key: string): Promise<Uint8Array | null> {
  const object = await getBucket().get(key);
  if (!object) return null;
  return new Uint8Array(await object.arrayBuffer());
}

export async function deleteStoredFile(key: string): Promise<void> {
  await getBucket().delete(key);
}

export async function deleteStoredFiles(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await getBucket().delete(keys);
}
