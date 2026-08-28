import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8").replaceAll("\r\n", "\n");
}

const route = readProjectFile("src/app/api/records/route.ts");
const form = readProjectFile("src/components/DailyRecordForm.tsx");

function sectionBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || endIndex < 0) throw new Error(`Seção não encontrada: ${start}`);
  return source.slice(startIndex, endIndex);
}

describe("RECORD-02 contrato de PATCH e ciclo de vida da foto", () => {
  const parsedFields = sectionBetween(route, "function parseRecordFields", "function isPhotoRemovalRequested");
  const photoRemoval = sectionBetween(route, "function isPhotoRemovalRequested", "function photoFieldsForPatch");
  const photoPatch = sectionBetween(route, "function photoFieldsForPatch", "function rateLimitedResponse");
  const createBranch = sectionBetween(route, "if (mode === \"create\")", "if (!recordId)");
  const updateCall = sectionBetween(route, "const updated = await updateRecord(", "if (!updated)");

  it("preserva a foto quando o PATCH não recebe campo de foto", () => {
    expect(parsedFields).not.toContain("photo_data");
    expect(photoPatch).toContain("return {};");
    expect(route).toContain("...photoFieldsForPatch(form, photo)");
  });

  it("substitui a foto somente quando um novo arquivo foi fornecido", () => {
    expect(photoPatch).toContain("if (photo.provided) return { photo_data: photo.data };");
    expect(photoPatch).toContain("if (photo.provided)");
    expect(photoPatch).not.toContain("if (photo.data)");
  });

  it("remove a foto somente com intenção explícita de remoção", () => {
    expect(photoPatch).toContain("if (isPhotoRemovalRequested(form)) return { photo_data: null };");
    expect(photoRemoval).toContain('value === "on" || value === "true"');
    expect(route).not.toContain('form.get("remove_photo") === "on" || form.get("remove_photo") === "true"');
  });

  it("mantém os limites existentes de upload e valida assinatura do arquivo", () => {
    expect(route).toContain("const MAX_PHOTO_BYTES = 3 * 1024 * 1024;");
    expect(route).toContain('new Set(["image/jpeg", "image/png", "image/webp"])');
    expect(route).toContain("if (photo.size > MAX_PHOTO_BYTES)");
    expect(route).toContain("validImageSignature(photo.type, bytes)");
  });

  it("mantém POST e PATCH separados, sem criar registro no caminho de edição", () => {
    expect(route).toContain('export async function POST(req: NextRequest) {\n  return saveRecord(req, "create");');
    expect(route).toContain('export async function PATCH(req: NextRequest) {\n  return saveRecord(req, "update");');
    expect(createBranch).toContain("createRecord");
    expect(updateCall).not.toContain("createRecord");
    expect(route).toContain('if (!recordId) return NextResponse.json({ error: "Registro não informado." }, { status: 400 });');
    expect(route).toContain("const updated = await updateRecord(");
  });
});

describe("RECORD-02 intenção enviada pela UI", () => {
  it("usa PATCH e record_id ao editar o registro existente", () => {
    expect(form).toContain('method: isEditing ? "PATCH" : "POST"');
    expect(form).toContain('if (initialRecord?.id) formData.set("record_id", initialRecord.id);');
    expect(form).toContain("router.push(\"/cuidador\");");
    expect(form).toContain("router.refresh();");
  });

  it("mantém remoção e substituição mutuamente exclusivas no formulário", () => {
    expect(form).toContain('name="remove_photo"');
    expect(form).toContain("checked={removePhoto}");
    expect(form).toContain("onChange={(event) => setRemovePhoto(event.target.checked)}");
    expect(form).toContain("if (event.target.files?.length) setRemovePhoto(false);");
  });
});
