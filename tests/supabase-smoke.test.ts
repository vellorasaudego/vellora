import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

const scriptPath = join(process.cwd(), "scripts", "supabase-smoke.mjs");
const smoke = await import("../scripts/supabase-smoke.mjs");

function cleanEnvironment(): NodeJS.ProcessEnv {
  const environment = { ...process.env };
  for (const key of [
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "VELLORA_AUTH_PROVIDER",
    "VELLORA_DATA_PROVIDER",
    "VELLORA_STORAGE_PROVIDER",
  ]) {
    delete environment[key];
  }
  return environment;
}

function validEnvironment(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    ...cleanEnvironment(),
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key-for-test",
    SUPABASE_SECRET_KEY: "server-key-for-test",
    VELLORA_AUTH_PROVIDER: "supabase",
    VELLORA_DATA_PROVIDER: "supabase",
    VELLORA_STORAGE_PROVIDER: "supabase",
    ...overrides,
  };
}

function runScript(environment: NodeJS.ProcessEnv, args: string[] = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: process.cwd(),
    env: environment,
    encoding: "utf8",
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

describe("smoke test read-only do Supabase", () => {
  it("interpreta --help sem exigir rede ou credenciais", () => {
    const result = runScript(cleanEnvironment(), ["--help"]);

    expect(result.status).toBe(0);
    expect(result.output).toContain("read-only");
    expect(result.output).toContain("SUPABASE_SECRET_KEY");
  });

  it("falha cedo sem chave administrativa e não anuncia sucesso parcial", () => {
    const result = runScript(validEnvironment({ SUPABASE_SECRET_KEY: undefined }));

    expect(result.status).toBe(1);
    expect(result.output).toContain("SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY");
    expect(result.output).toContain("não concluído");
    expect(result.output).not.toContain("concluído com sucesso");
  });

  it("rejeita providers misturados antes de chamar a rede", () => {
    const result = runScript(validEnvironment({ VELLORA_STORAGE_PROVIDER: "legacy" }));

    expect(result.status).toBe(1);
    expect(result.output).toContain("VELLORA_STORAGE_PROVIDER");
    expect(result.output).not.toContain("concluído com sucesso");
  });

  it("rejeita duas chaves administrativas configuradas ao mesmo tempo", () => {
    const result = runScript(validEnvironment({ SUPABASE_SERVICE_ROLE_KEY: "another-server-key" }));

    expect(result.status).toBe(1);
    expect(result.output).toContain("somente uma chave administrativa");
    expect(result.output).not.toContain("another-server-key");
  });

  it("valida aliases, flags e URL sem expor chaves", () => {
    const config = smoke.validateConfig(validEnvironment({
      SUPABASE_URL: "https://example.supabase.co/",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key-for-test",
      SUPABASE_SECRET_KEY: "server-secret-value",
    }));

    expect(config.url).toBe("https://example.supabase.co");
    expect(config.providers.VELLORA_DATA_PROVIDER).toBe("supabase");
    expect(smoke.redactSecrets("key=server-secret-value", [config.serverKey])).toBe("key=[redacted]");
    expect(smoke.redactSecrets("public-key-for-test", [config.publicKey])).toBe("[redacted]");
  });

  it("confirma somente leituras quando Auth, tabelas e Storage estão disponíveis", async () => {
    const config = smoke.validateConfig(validEnvironment());
    const tableCalls: string[] = [];
    const listUsers = vi.fn(async () => ({ data: { users: [] }, error: null }));
    const listBuckets = vi.fn(async () => ({
      data: [
        {
          id: "record-photos",
          name: "record-photos",
          public: false,
          file_size_limit: 3 * 1024 * 1024,
          allowed_mime_types: ["image/jpeg", "image/png", "image/webp"],
        },
        {
          id: "contracts",
          name: "contracts",
          public: false,
          file_size_limit: 4 * 1024 * 1024,
          allowed_mime_types: ["application/pdf"],
        },
      ],
      error: null,
    }));
    const client = {
      auth: { admin: { listUsers } },
      storage: { listBuckets },
      from: vi.fn((table: string) => {
        tableCalls.push(table);
        return { select: vi.fn(async () => ({ data: null, error: null })) };
      }),
    };

    const result = await smoke.runSupabaseSmoke(config, client);

    expect(result).toEqual({ authUserCount: 0, profileCount: 0, tableCount: 10, bucketCount: 2 });
    expect(listUsers).toHaveBeenCalledWith({ page: 1, perPage: smoke.AUTH_USERS_PAGE_SIZE });
    expect(listBuckets).toHaveBeenCalledOnce();
    expect(tableCalls).toEqual([...smoke.ESSENTIAL_TABLES]);
  });

  it("lista todas as páginas de Auth sem depender de uma resposta única", async () => {
    const firstPageUsers = [
      { id: "00000000-0000-0000-0000-000000000001" },
      { id: "00000000-0000-0000-0000-000000000002" },
    ];
    const thirdUser = { id: "00000000-0000-0000-0000-000000000003" };
    const listUsers = vi
      .fn()
      .mockResolvedValueOnce({ data: { users: firstPageUsers, nextPage: 2 }, error: null })
      .mockResolvedValueOnce({ data: { users: [thirdUser], nextPage: null }, error: null });

    const users = await smoke.listAuthUsers(
      { auth: { admin: { listUsers } } },
      2,
    );

    expect(users).toEqual([...firstPageUsers, thirdUser]);
    expect(listUsers).toHaveBeenNthCalledWith(1, { page: 1, perPage: 2 });
    expect(listUsers).toHaveBeenNthCalledWith(2, { page: 2, perPage: 2 });
  });

  it("exige profile ativo e role suportada para cada usuário Auth", async () => {
    const users = [
      { id: "00000000-0000-0000-0000-000000000001" },
      { id: "00000000-0000-0000-0000-000000000002" },
      { id: "00000000-0000-0000-0000-000000000003" },
    ];
    const profileQuery = vi.fn(async () => ({
      data: [
        { id: users[0].id, role: "admin", active: true },
        { id: users[1].id, role: "familia", active: false },
      ],
      error: null,
    }));
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({ in: profileQuery })),
      })),
    };

    await expect(smoke.verifyAuthProfiles(client, users)).rejects.toThrow(
      "2 usuário(s) Auth não possui(em) perfil ativo com role válida",
    );
    expect(profileQuery).toHaveBeenCalledWith("id", users.map(({ id }) => id));
  });

  it("não consulta profiles quando não há usuários Auth", async () => {
    const from = vi.fn();

    await expect(smoke.verifyAuthProfiles({ from }, [])).resolves.toEqual({ profileCount: 0 });
    expect(from).not.toHaveBeenCalled();
  });

  it("rejeita efetivamente um bucket público", async () => {
    const config = smoke.validateConfig(validEnvironment());
    const client = {
      auth: { admin: { listUsers: vi.fn(async () => ({ data: { users: [] }, error: null })) } },
      storage: {
        listBuckets: vi.fn(async () => ({
          data: [
            {
              id: "record-photos",
              name: "record-photos",
              public: true,
              file_size_limit: 3 * 1024 * 1024,
              allowed_mime_types: ["image/jpeg", "image/png", "image/webp"],
            },
            {
              id: "contracts",
              name: "contracts",
              public: false,
              file_size_limit: 4 * 1024 * 1024,
              allowed_mime_types: ["application/pdf"],
            },
          ],
          error: null,
        })),
      },
      from: vi.fn(() => ({ select: vi.fn(async () => ({ data: null, error: null })) })),
    };

    await expect(smoke.runSupabaseSmoke(config, client)).rejects.toThrow("record-photos não está privado");
  });

  it("não contém operações de escrita nem credenciais hardcoded", () => {
    const source = readFileSync(scriptPath, "utf8");

    expect(source).not.toMatch(/\.(?:insert|upsert|update|delete|upload|remove)\s*\(/);
    expect(source).not.toContain("apply_migration");
    expect(source).not.toContain("execute_sql");
    expect(source).not.toMatch(/\b(?:sb_(?:secret|service_role|publishable)_[A-Za-z0-9._-]{20,}|eyJ[A-Za-z0-9._-]{20,})\b/);
    expect(smoke.REQUIRED_BUCKETS["record-photos"].fileSizeLimit).toBe(3 * 1024 * 1024);
  });
});
