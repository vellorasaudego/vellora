import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const scriptPath = join(process.cwd(), "scripts", "provision-supabase-user.mjs");

function cleanEnvironment(): NodeJS.ProcessEnv {
  const environment = { ...process.env };
  for (const key of [
    "SUPABASE_URL",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_PROVISION_EMAIL",
    "SUPABASE_PROVISION_NAME",
    "SUPABASE_PROVISION_PASSWORD",
    "SUPABASE_PROVISION_ROLE",
    "SUPABASE_PROVISION_PHONE",
    "SUPABASE_PROVISION_RESET_PASSWORD",
  ]) {
    delete environment[key];
  }
  return environment;
}

function runScript(args: string[], environment: NodeJS.ProcessEnv = cleanEnvironment()): string {
  try {
    return execFileSync(process.execPath, [scriptPath, ...args], {
      cwd: process.cwd(),
      env: environment,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string };
    return `${failure.stdout ?? ""}${failure.stderr ?? ""}`;
  }
}

describe("provisionamento operacional Supabase", () => {
  it("falha cedo com uma mensagem acionável quando faltam entradas", () => {
    const output = runScript([]);

    expect(output).toContain("SUPABASE_URL");
    expect(output).toContain("SUPABASE_PROVISION_EMAIL");
    expect(output).toContain("SUPABASE_PROVISION_PASSWORD");
    expect(output).toContain("SUPABASE_PROVISION_ROLE");
  });

  it("rejeita role inválido antes de tentar a rede e não ecoa credenciais", () => {
    const password = "senha-que-nao-pode-aparecer";
    const secret = ["server", "secret", "somente-teste"].join("-");
    const environment = {
      ...cleanEnvironment(),
      SUPABASE_URL: "https://punannbkoiekhvbnqqkh.supabase.co",
      SUPABASE_SECRET_KEY: secret,
      SUPABASE_PROVISION_EMAIL: "admin@example.com",
      SUPABASE_PROVISION_NAME: "Administrador",
      SUPABASE_PROVISION_PASSWORD: password,
      SUPABASE_PROVISION_ROLE: "owner",
    };
    const output = runScript([], environment);

    expect(output).toContain("Role inválido");
    expect(output).toContain("admin, familia, cuidador");
    expect(output).not.toContain(password);
    expect(output).not.toContain(secret);
  });

  it("usa somente a API administrativa oficial e não contém credenciais hardcoded", () => {
    const source = readFileSync(scriptPath, "utf8");

    expect(source).toContain("auth.admin.listUsers");
    expect(source).toContain("auth.admin.createUser");
    expect(source).toContain("auth.admin.updateUserById");
    expect(source).toContain("email_confirm: true");
    expect(source).not.toMatch(/\beyJ[A-Za-z0-9._-]{20,}\b/);
    expect(source).not.toMatch(/\bsb_(?:secret|service_role)_[A-Za-z0-9._-]{20,}\b/);
    expect(source).not.toMatch(/console\.(?:log|error|warn)\([^\n]*(?:\$\{[^}\n]*(?:password|secretKey|serviceRoleKey)|\b(?:config|args|process\.env)\.(?:password|secretKey|serviceRoleKey))/i);
  });

  it("mantém defaults locais seguros e documenta a ordem de ativação", () => {
    const envExample = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    const documentation = readFileSync(join(process.cwd(), "SUPABASE_PROVISIONING.md"), "utf8");

    expect(envExample).toContain("VELLORA_AUTH_PROVIDER=legacy");
    expect(envExample).not.toMatch(/SUPABASE_(?:SERVICE_ROLE|SECRET)[_-]?KEY\s*=/i);
    expect(documentation).toContain("SUPABASE_SECRET_KEY");
    expect(documentation).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(documentation).toMatch(/migrations[\s\S]*Storage[\s\S]*provisionar/i);
    expect(documentation).toContain("VELLORA_DATA_PROVIDER=supabase");
    expect(documentation).toContain("VELLORA_STORAGE_PROVIDER=supabase");
  });
});
