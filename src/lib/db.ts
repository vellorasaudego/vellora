import { env } from "cloudflare:workers";
import bcrypt from "bcryptjs";
import { createHmac, randomUUID } from "crypto";
import { normalizeRecoveryEmail, normalizeRecoveryPassword } from "./recovery";
import { runtimeValue } from "./runtime-config";

type D1Value = string | number | null | ArrayBuffer | ArrayBufferView;

type D1Result<T> = {
  results?: T[];
};

type D1StatementLike = {
  bind(...values: D1Value[]): D1StatementLike;
  all<T>(): Promise<D1Result<T>>;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
};

type D1BindingLike = {
  prepare(sql: string): D1StatementLike;
  batch(statements: D1StatementLike[]): Promise<unknown[]>;
};

declare global {
  var __velloraReady: Promise<void> | undefined;
}

function getBinding(): D1BindingLike {
  const binding = (env as { DB?: D1BindingLike }).DB;
  if (!binding) throw new Error("O banco de dados do site não está disponível.");
  return binding;
}

function normalizeSql(text: string): string {
  return text.replace(/\$(\d+)/g, "?$1").replace(/now\(\)/gi, "CURRENT_TIMESTAMP");
}

function normalizeParam(value: unknown): D1Value {
  if (value == null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "string" || typeof value === "number") return value;
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return value;
  return String(value);
}

function parseJsonList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function normalizeRow<T>(input: T): T {
  if (!input || typeof input !== "object") return input;
  const row = { ...(input as Record<string, unknown>) };
  if ("availability_days" in row) row.availability_days = parseJsonList(row.availability_days);
  if ("availability_shifts" in row) row.availability_shifts = parseJsonList(row.availability_shifts);
  if ("changed_fields" in row) row.changed_fields = parseJsonList(row.changed_fields);
  if ("lgpd_consent" in row) row.lgpd_consent = Boolean(row.lgpd_consent);
  return row as T;
}

function statement(text: string, params: unknown[] = []): D1StatementLike {
  return getBinding().prepare(normalizeSql(text)).bind(...params.map(normalizeParam));
}

async function bootstrapAdminIfConfigured(): Promise<void> {
  const email = runtimeValue("VELLORA_BOOTSTRAP_ADMIN_EMAIL")?.trim().toLowerCase();
  const password = runtimeValue("VELLORA_BOOTSTRAP_ADMIN_PASSWORD");
  if (!email || !password) return;

  const existing = await getBinding()
    .prepare("SELECT COUNT(*) AS total FROM users")
    .first<{ total: number }>();
  if (Number(existing?.total || 0) > 0) return;

  await statement(
    "INSERT INTO users (id, name, email, password_hash, role, phone) VALUES ($1,$2,$3,$4,'admin',$5)",
    [
      randomUUID(),
      runtimeValue("VELLORA_BOOTSTRAP_ADMIN_NAME")?.trim() || "Administrador Vellora",
      email,
      bcrypt.hashSync(password, 10),
      runtimeValue("VELLORA_BOOTSTRAP_ADMIN_PHONE")?.trim() || null,
    ]
  ).run();
}

async function recoverAdminIfConfigured(): Promise<void> {
  const email = normalizeRecoveryEmail(runtimeValue("VELLORA_ADMIN_RECOVERY_EMAIL"));
  const password = normalizeRecoveryPassword(runtimeValue("VELLORA_ADMIN_RECOVERY_PASSWORD"));
  const sessionSecret = runtimeValue("VELLORA_SESSION_SECRET");
  if (!email && !password) return;

  if (!email || !password || password.length < 12 || !sessionSecret) {
    console.error("Recuperação administrativa não aplicada por configuração incompleta.");
    return;
  }

  const deploymentScope =
    runtimeValue("CF_PAGES_COMMIT_SHA") || runtimeValue("VERCEL_DEPLOYMENT_ID") || "sites";
  const recoveryHash = createHmac("sha256", sessionSecret)
    .update(`${deploymentScope}\u0000${email}\u0000${password}`)
    .digest("hex");
  const binding = getBinding();
  const previous = await binding
    .prepare("SELECT 1 FROM admin_recovery_events WHERE recovery_hash = ?1")
    .bind(recoveryHash)
    .first();
  if (previous) return;

  const existingAdmin = await binding
    .prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1")
    .first<{ id: string }>();
  const conflictingUser = await binding
    .prepare("SELECT id FROM users WHERE email = ?1 AND id <> ?2 LIMIT 1")
    .bind(email, existingAdmin?.id || "")
    .first();
  if (conflictingUser) {
    console.error("Recuperação administrativa não aplicada: e-mail já está em uso.");
    return;
  }

  const adminUserId = existingAdmin?.id || randomUUID();
  const passwordHash = bcrypt.hashSync(password, 10);
  const writes: D1StatementLike[] = [];
  if (existingAdmin) {
    writes.push(
      binding
        .prepare(
          `UPDATE users
           SET email = ?1, password_hash = ?2, session_version = session_version + 1,
               deleted_at = NULL
           WHERE id = ?3`
        )
        .bind(email, passwordHash, adminUserId)
    );
  } else {
    writes.push(
      binding
        .prepare(
          `INSERT INTO users (id, name, email, password_hash, role, phone)
           VALUES (?1,?2,?3,?4,'admin',?5)`
        )
        .bind(
          adminUserId,
          runtimeValue("VELLORA_BOOTSTRAP_ADMIN_NAME")?.trim() || "Administrador Vellora",
          email,
          passwordHash,
          runtimeValue("VELLORA_BOOTSTRAP_ADMIN_PHONE")?.trim() || null
        )
    );
  }
  writes.push(
    binding
      .prepare(
        "UPDATE password_reset_tokens SET used_at = COALESCE(used_at, CURRENT_TIMESTAMP) WHERE user_id = ?1"
      )
      .bind(adminUserId),
    binding
      .prepare(
        "INSERT INTO admin_recovery_events (recovery_hash, admin_user_id) VALUES (?1,?2)"
      )
      .bind(recoveryHash, adminUserId)
  );
  await binding.batch(writes);
}

export function ready(): Promise<void> {
  if (!global.__velloraReady) {
    global.__velloraReady = bootstrapAdminIfConfigured()
      .then(() => recoverAdminIfConfigured())
      .catch((error) => {
        global.__velloraReady = undefined;
        throw error;
      });
  }
  return global.__velloraReady;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  await ready();
  const prepared = statement(text, params);
  if (/^\s*(SELECT|WITH|PRAGMA)\b/i.test(text) || /\bRETURNING\b/i.test(text)) {
    const result = await prepared.all<T>();
    return (result.results || []).map(normalizeRow);
  }
  await prepared.run();
  return [];
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}

export async function executeBatch(
  commands: Array<{ text: string; params?: unknown[] }>
): Promise<void> {
  await ready();
  await getBinding().batch(
    commands.map((command) => statement(command.text, command.params || []))
  );
}
