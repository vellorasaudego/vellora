import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  getUserById: vi.fn(),
  getCaregiverProfile: vi.fn(),
  getContractDocument: vi.fn(),
  registerStoredContractDocument: vi.fn(),
  isContractStorageKeyRegistered: vi.fn(),
  createSupabaseSignedUploadUrl: vi.fn(),
  inspectSupabaseFile: vi.fn(),
  moveSupabaseFile: vi.fn(),
  deleteSupabaseFile: vi.fn(),
  resolveStorageProvider: vi.fn(),
  runtimeValue: vi.fn(),
  apiError: vi.fn(),
}));

vi.mock("@/lib/guard", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/data", () => ({
  getUserById: mocks.getUserById,
  getCaregiverProfile: mocks.getCaregiverProfile,
  getContractDocument: mocks.getContractDocument,
  registerStoredContractDocument: mocks.registerStoredContractDocument,
  isContractStorageKeyRegistered: mocks.isContractStorageKeyRegistered,
}));
vi.mock("@/lib/supabase/storage", () => ({
  createSupabaseSignedUploadUrl: mocks.createSupabaseSignedUploadUrl,
  inspectSupabaseFile: mocks.inspectSupabaseFile,
  moveSupabaseFile: mocks.moveSupabaseFile,
  deleteSupabaseFile: mocks.deleteSupabaseFile,
}));
vi.mock("@/lib/supabase/storage-config", () => ({ resolveStorageProvider: mocks.resolveStorageProvider }));
vi.mock("@/lib/runtime-config", () => ({ runtimeValue: mocks.runtimeValue }));
vi.mock("@/lib/api-error", () => ({ apiError: mocks.apiError }));

import { POST as createUploadUrl } from "../src/app/api/admin/contracts/upload-url/route";
import { POST as finalizeUpload } from "../src/app/api/admin/contracts/finalize/route";

const ownerId = "11111111-1111-4111-8111-111111111111";
const adminId = "22222222-2222-4222-8222-222222222222";
const uploadId = "44444444-4444-4444-8444-444444444444";

function request(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function guardError(status: 401 | 403) {
  return { error: NextResponse.json({ error: "bloqueado" }, { status }) };
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.requireRole.mockResolvedValue({ session: { userId: adminId, role: "admin" } });
  mocks.getUserById.mockResolvedValue({ id: ownerId, role: "familia", deleted_at: null });
  mocks.getContractDocument.mockResolvedValue(undefined);
  mocks.registerStoredContractDocument.mockResolvedValue({ id: uploadId, file_name: "contrato.pdf" });
  mocks.isContractStorageKeyRegistered.mockResolvedValue(false);
  mocks.resolveStorageProvider.mockReturnValue("supabase");
  mocks.runtimeValue.mockImplementation((key: string) => {
    if (key === "VELLORA_STORAGE_PROVIDER") return "supabase";
    if (key === "VELLORA_CONTRACT_DIRECT_UPLOAD") return "true";
    if (key === "VELLORA_SESSION_SECRET") return "test-session-secret-for-contract-upload";
    return undefined;
  });
  mocks.createSupabaseSignedUploadUrl.mockResolvedValue({
    uploadEndpoint: "https://project.supabase.co/storage/v1/upload/resumable",
    token: "signed-token",
    expiresAt: "2026-09-16T12:00:00.000Z",
  });
  mocks.apiError.mockImplementation((_error: unknown, _context: string, message: string) =>
    NextResponse.json({ error: message }, { status: 503 }),
  );
});

describe("upload direto de contratos", () => {
  it("recusa usuário não administrativo antes de gerar token", async () => {
    mocks.requireRole.mockResolvedValue(guardError(403));
    const response = await createUploadUrl(
      request("https://vellora.test/api/admin/contracts/upload-url", {
        ownerType: "family",
        ownerId,
        fileName: "contrato.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
      }),
    );
    expect(response.status).toBe(403);
    expect(mocks.createSupabaseSignedUploadUrl).not.toHaveBeenCalled();
  });

  it("gera apenas metadados e ticket para arquivo de até 10 MB", async () => {
    const response = await createUploadUrl(
      request("https://vellora.test/api/admin/contracts/upload-url", {
        ownerType: "family",
        ownerId,
        fileName: "contrato.pdf",
        fileSize: 10_000_000,
        mimeType: "application/pdf",
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, tusEndpoint: expect.stringContaining("/storage/v1/upload/resumable") });
    expect(body.token).toBe("signed-token");
    expect(body.path).toMatch(/^contracts\/pending\/[0-9a-f-]+\.pdf$/);
    expect(mocks.createSupabaseSignedUploadUrl).toHaveBeenCalledWith(body.path, "application/pdf");
  });

  it("finaliza validando a assinatura do PDF e registra sem duplicar", async () => {
    const ticket = await (await import("../src/lib/contracts/direct-upload")).createContractUploadTicket({
      uploadId,
      ownerType: "family",
      ownerId,
      fileName: "contrato.pdf",
      fileSize: 5,
      mimeType: "application/pdf",
      pendingPath: `contracts/pending/${uploadId}.pdf`,
      uploadedBy: adminId,
    });
    mocks.inspectSupabaseFile.mockResolvedValue({
      bytes: new TextEncoder().encode("%PDF-"),
      contentType: "application/pdf",
      updatedAt: "2026-09-16T10:00:00.000Z",
    });
    const response = await finalizeUpload(
      request("https://vellora.test/api/admin/contracts/finalize", { ticket }),
    );
    expect(response.status).toBe(200);
    expect(mocks.moveSupabaseFile).toHaveBeenCalledWith(
      `contracts/pending/${uploadId}.pdf`,
      `contracts/${uploadId}.pdf`,
    );
    expect(mocks.registerStoredContractDocument).toHaveBeenCalledWith(expect.objectContaining({ id: uploadId }));
  });
});
