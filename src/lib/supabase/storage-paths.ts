export const STORAGE_BUCKETS = {
  recordPhotos: "record-photos",
  contracts: "contracts",
} as const;

export const STORAGE_LIMITS = {
  photoBytes: 3 * 1024 * 1024,
  contractBytes: 4 * 1024 * 1024,
} as const;

export const STORAGE_MIME_TYPES = {
  photos: ["image/jpeg", "image/png", "image/webp"] as const,
  contracts: ["application/pdf"] as const,
} as const;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PHOTO_PATH = new RegExp(
  `^patients/(${UUID})/records/(${UUID})/(${UUID})\\.(jpg|jpeg|png|webp)$`,
  "",
);
const CONTRACT_PATH = new RegExp(`^contracts/(${UUID})\\.pdf$`);

export type StorageObjectPath =
  | {
      kind: "photo";
      bucket: typeof STORAGE_BUCKETS.recordPhotos;
      path: string;
      patientId: string;
      recordId: string;
      fileId: string;
      extension: string;
    }
  | {
      kind: "contract";
      bucket: typeof STORAGE_BUCKETS.contracts;
      path: string;
      contractId: string;
      extension: "pdf";
    };

/**
 * Storage keys are deliberately strict. The patient and record UUIDs are
 * part of a photo key so the database policies can authorize the object
 * without trusting a client-supplied role or JWT metadata claim.
 */
export function classifyStoragePath(key: string): StorageObjectPath | null {
  if (typeof key !== "string") return null;

  const photo = PHOTO_PATH.exec(key);
  if (photo) {
    return {
      kind: "photo",
      bucket: STORAGE_BUCKETS.recordPhotos,
      path: key,
      patientId: photo[1],
      recordId: photo[2],
      fileId: photo[3],
      extension: photo[4].toLowerCase(),
    };
  }

  const contract = CONTRACT_PATH.exec(key);
  if (contract) {
    return {
      kind: "contract",
      bucket: STORAGE_BUCKETS.contracts,
      path: key,
      contractId: contract[1],
      extension: "pdf",
    };
  }

  return null;
}

export function assertStoragePath(key: string): StorageObjectPath {
  const parsed = classifyStoragePath(key);
  if (!parsed) {
    throw new Error(
      "Chave de armazenamento inválida. Use patients/<patient-uuid>/records/<record-uuid>/<file-uuid>.<ext> para fotos ou contracts/<contract-uuid>.pdf para contratos.",
    );
  }
  return parsed;
}

export function assertStorageContentType(
  object: StorageObjectPath,
  contentType: string,
): string {
  const normalized = contentType.trim().toLowerCase();
  const allowed: readonly string[] =
    object.kind === "photo" ? STORAGE_MIME_TYPES.photos : STORAGE_MIME_TYPES.contracts;
  if (!allowed.includes(normalized)) {
    throw new Error("Tipo de conteúdo não permitido para esta chave de armazenamento.");
  }

  if (
    (object.kind === "photo" &&
      ((object.extension === "jpg" || object.extension === "jpeg") && normalized !== "image/jpeg" ||
        object.extension === "png" && normalized !== "image/png" ||
        object.extension === "webp" && normalized !== "image/webp")) ||
    (object.kind === "contract" && normalized !== "application/pdf")
  ) {
    throw new Error("A extensão do arquivo não corresponde ao tipo de conteúdo informado.");
  }

  return normalized;
}

export function maxBytesForStoragePath(object: StorageObjectPath): number {
  return object.kind === "photo" ? STORAGE_LIMITS.photoBytes : STORAGE_LIMITS.contractBytes;
}
