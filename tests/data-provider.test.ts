import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("boundary do adapter de dados Supabase", () => {
  const adapter = readProjectFile("src/lib/supabase/data.ts");
  const facade = readProjectFile("src/lib/data.ts");

  it("seleciona provider explicitamente e bloqueia mistura com Auth legado", () => {
    expect(adapter).toContain('value?.trim().toLowerCase() === "supabase" ? "supabase" : "legacy"');
    expect(facade).toContain('runtimeValue("VELLORA_AUTH_PROVIDER")');
    expect(facade).toContain("VELLORA_DATA_PROVIDER=supabase");
    expect(adapter).toContain("assertAuthAndDataProviders");
  });

  it("mantém a fronteira server-side do cliente privilegiado", () => {
    expect(adapter).toContain("if (typeof window !== \"undefined\")");
    expect(adapter).toContain("SUPABASE_SECRET_KEY");
    expect(adapter).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(adapter).not.toContain("NEXT_PUBLIC_SUPABASE_SECRET_KEY");
    expect(adapter).not.toContain("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY");
    expect(readProjectFile("src/lib/supabase/client.ts")).not.toMatch(
      /SUPABASE_(?:SERVICE_ROLE|SECRET)[_-]?KEY/i,
    );
  });

  it("mapeia o domínio Postgres sem reintroduzir base64 no banco", () => {
    expect(adapter).toContain("incident: asBoolean(row.incident) ? 1 : 0");
    expect(adapter).toContain("photo_storage_key: photoKey");
    expect(adapter).toContain("patients/${assertUuid(patientId, \"Paciente\")}/records/");
    expect(adapter).toContain("/${randomUUID()}.${photoExtension(parsed.contentType)}");
    expect(adapter).toContain("storageEnabled()");
    expect(adapter).toContain("parsePhotoDataUri");
    expect(adapter).toContain("changed_fields: Object.keys(snapshot)");
    expect(adapter).toContain("after_data: snapshot");
    expect(adapter).toContain("before_data: snapshotDailyRecord(existing)");
    expect(adapter).not.toMatch(/insert\(\{[\s\S]*?photo_data\s*:/);
  });

  it("rejeita IDs não-UUID antes de consultar tabelas Supabase", () => {
    expect(adapter).toContain("UUID_PATTERN");
    expect(adapter).toContain("não é um UUID Supabase válido");
    expect(adapter).toContain('assertUuid(input.patient_id, "Paciente")');
    expect(adapter).toContain('assertUuid(input.caregiver_user_id, "Cuidador")');
  });
});
