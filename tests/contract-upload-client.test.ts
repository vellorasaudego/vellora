import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src/components/admin/ContractManager.tsx"),
  "utf8",
).replaceAll("\r\n", "\n");

describe("upload direto de contratos no navegador", () => {
  it("usa o access token Supabase para a identidade e o token assinado somente na assinatura", () => {
    expect(source).toContain("createSupabaseBrowserClient");
    expect(source).toContain("auth.getSession()");
    expect(source).toContain("Authorization: `Bearer ${accessToken}`");
    expect(source).toContain('"x-signature": details.token');
    expect(source).not.toContain("Authorization: `Bearer ${details.token}`");
  });

  it("exibe uma orientação segura quando a sessão Supabase não está disponível", () => {
    expect(source).toContain("Sua sessão expirou. Atualize a página e entre novamente.");
  });
});
