import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const REQUIRED_PROVIDER_FLAGS = Object.freeze([
  "VELLORA_AUTH_PROVIDER",
  "VELLORA_DATA_PROVIDER",
  "VELLORA_STORAGE_PROVIDER",
]);

export const AUTH_USERS_PAGE_SIZE = 1000;
export const PROFILE_QUERY_BATCH_SIZE = 500;
export const SUPPORTED_PROFILE_ROLES = Object.freeze(["admin", "familia", "cuidador"]);

export const ESSENTIAL_TABLES = Object.freeze([
  "profiles",
  "patients",
  "caregiver_assignments",
  "leads",
  "professional_applications",
  "caregiver_profiles",
  "daily_records",
  "daily_record_audit_events",
  "rate_limit_buckets",
  "contract_documents",
]);

export const REQUIRED_BUCKETS = Object.freeze({
  "record-photos": Object.freeze({
    fileSizeLimit: 3 * 1024 * 1024,
    allowedMimeTypes: Object.freeze(["image/jpeg", "image/png", "image/webp"]),
  }),
  contracts: Object.freeze({
    fileSizeLimit: 4 * 1024 * 1024,
    allowedMimeTypes: Object.freeze(["application/pdf"]),
  }),
});

function nonEmptyValues(env, names) {
  return names
    .map((name) => ({ name, value: typeof env[name] === "string" ? env[name].trim() : "" }))
    .filter(({ value }) => value !== "");
}

function readAliasedValue(env, names, label) {
  const values = nonEmptyValues(env, names);
  if (values.length > 1 && new Set(values.map(({ value }) => value)).size > 1) {
    throw new Error(`${label} conflitantes; mantenha apenas uma configuração ou use valores idênticos.`);
  }
  return values[0]?.value ?? "";
}

function readSingleAliasedValue(env, names, label) {
  const values = nonEmptyValues(env, names);
  if (values.length > 1) {
    throw new Error(`${label} duplicadas; mantenha somente uma chave administrativa configurada.`);
  }
  return values[0]?.value ?? "";
}

function normalizeUrlForComparison(value) {
  return value.trim().replace(/\/+$/, "");
}

function readUrl(env) {
  const values = nonEmptyValues(env, ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]);
  if (values.length > 1) {
    const normalized = new Set(values.map(({ value }) => normalizeUrlForComparison(value)));
    if (normalized.size > 1) {
      throw new Error("SUPABASE_URL e NEXT_PUBLIC_SUPABASE_URL estão conflitantes.");
    }
  }
  return values[0]?.value ?? "";
}

function normalizeSupabaseUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL deve ser uma URL válida.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("A URL do Supabase deve usar HTTPS; o smoke test considera somente produção.");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") {
    throw new Error("A URL do Supabase deve conter somente o origin HTTPS do projeto.");
  }

  return parsed.origin;
}

function validateKey(value, label) {
  if (!value) {
    throw new Error(`${label} é obrigatória para executar o smoke test.`);
  }
  if (/\s/.test(value)) {
    throw new Error(`${label} não pode conter espaços ou quebras de linha.`);
  }
}

function validateProviders(env) {
  const incompatible = REQUIRED_PROVIDER_FLAGS.filter(
    (name) => (typeof env[name] === "string" ? env[name].trim().toLowerCase() : "") !== "supabase",
  );
  if (incompatible.length > 0) {
    throw new Error(
      `Ativação bloqueada: configure ${REQUIRED_PROVIDER_FLAGS.map((name) => `${name}=supabase`).join(", ")}. ` +
        `Flags ausentes ou incompatíveis: ${incompatible.join(", ")}.`,
    );
  }

  return Object.fromEntries(REQUIRED_PROVIDER_FLAGS.map((name) => [name, "supabase"]));
}

export function validateConfig(env = process.env) {
  const url = normalizeSupabaseUrl(readUrl(env));
  const publicKey = readAliasedValue(
    env,
    ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    "As chaves públicas do Supabase",
  );
  const serverKey = readSingleAliasedValue(
    env,
    ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
    "As chaves administrativas server-side do Supabase",
  );

  validateKey(publicKey, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY");
  validateKey(serverKey, "SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY");
  if (serverKey === publicKey || /^sb_publishable_/i.test(serverKey)) {
    throw new Error(
      "A chave server-side parece ser uma chave pública; use SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY sem prefixo NEXT_PUBLIC_.",
    );
  }

  return Object.freeze({
    url,
    publicKey,
    serverKey,
    providers: Object.freeze(validateProviders(env)),
  });
}

export function parseArgs(argv) {
  if (argv.length === 0) return Object.freeze({ help: false });
  if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h")) {
    return Object.freeze({ help: true });
  }
  throw new Error("Este smoke test não aceita argumentos; use variáveis de ambiente e --help.");
}

export function redactSecrets(message, secrets = []) {
  let safeMessage = String(message);
  const values = secrets
    .filter((value) => typeof value === "string" && value.length > 0)
    .sort((left, right) => right.length - left.length);

  for (const value of values) {
    safeMessage = safeMessage.split(value).join("[redacted]");
  }

  return safeMessage
    .replace(
      /(secret(?:[_ -]?key)?|service[_ -]?role[_ -]?key|publishable[_ -]?key|anon[_ -]?key|password)\s*[:=]\s*\S+/gi,
      "$1=[redacted]",
    )
    .replace(/\b(?:sb_(?:secret|service_role|publishable)_[A-Za-z0-9._-]+|eyJ[A-Za-z0-9._-]{20,})\b/g, "[redacted]");
}

function environmentSecrets(env) {
  return [
    env.SUPABASE_SECRET_KEY,
    env.SUPABASE_SERVICE_ROLE_KEY,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ].filter(Boolean);
}

function errorCode(error) {
  if (!error || typeof error !== "object") return "";
  const details = error;
  if (typeof details.code === "string" && details.code.trim() !== "") return ` (código ${details.code})`;
  if (typeof details.status === "number") return ` (HTTP ${details.status})`;
  if (typeof details.statusCode === "string" && details.statusCode.trim() !== "") {
    return ` (HTTP ${details.statusCode})`;
  }
  return "";
}

function remoteReadError(operation, error, action) {
  return new Error(`${operation}${errorCode(error)}. ${action}`);
}

async function fetchAuthUsersPage(client, page, pageSize) {
  let response;
  try {
    response = await client.auth.admin.listUsers({ page, perPage: pageSize });
  } catch (error) {
    throw remoteReadError(
      "A API administrativa do Supabase não respondeu",
      error,
      "Confirme a URL, a chave server-side e a conectividade de saída.",
    );
  }

  if (response?.error) {
    throw remoteReadError(
      "A API administrativa do Supabase recusou a leitura de Auth",
      response.error,
      "Confirme que a chave usada é server-side e pertence ao projeto informado.",
    );
  }
  if (!Array.isArray(response?.data?.users)) {
    throw new Error("A API administrativa do Supabase retornou uma resposta inesperada ao listar Auth.");
  }

  return response.data;
}

function nextAuthPage(data, currentPage, pageSize, returnedUsers) {
  const nextPage = data?.nextPage;
  if (nextPage !== undefined && nextPage !== null) {
    if (!Number.isInteger(nextPage) || nextPage <= currentPage) {
      throw new Error("A API administrativa do Supabase retornou uma paginação inesperada ao listar Auth.");
    }
    return nextPage;
  }

  return returnedUsers < pageSize ? null : currentPage + 1;
}

export async function listAuthUsers(client, pageSize = AUTH_USERS_PAGE_SIZE) {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error("O tamanho da página de Auth deve ser um inteiro positivo.");
  }

  const users = [];
  const visitedPages = new Set();
  let page = 1;

  while (page !== null) {
    if (visitedPages.has(page)) {
      throw new Error("A API administrativa do Supabase repetiu uma página ao listar Auth.");
    }
    visitedPages.add(page);

    const pageData = await fetchAuthUsersPage(client, page, pageSize);
    const pageUsers = pageData.users;
    if (pageUsers.some((user) => typeof user?.id !== "string" || user.id.trim() === "")) {
      throw new Error("A API administrativa do Supabase retornou um usuário sem id ao listar Auth.");
    }

    users.push(...pageUsers);
    page = nextAuthPage(pageData, page, pageSize, pageUsers.length);
  }

  return users;
}

export async function verifyAuthProfiles(client, authUsers) {
  if (!Array.isArray(authUsers)) {
    throw new Error("A lista de usuários Auth precisa ser um array.");
  }
  if (authUsers.length === 0) {
    return Object.freeze({ profileCount: 0 });
  }

  const userIds = authUsers.map((user) => user?.id);
  if (userIds.some((id) => typeof id !== "string" || id.trim() === "")) {
    throw new Error("A lista de usuários Auth contém um id inválido para validar profiles.");
  }

  const profiles = [];
  for (let offset = 0; offset < userIds.length; offset += PROFILE_QUERY_BATCH_SIZE) {
    const batch = userIds.slice(offset, offset + PROFILE_QUERY_BATCH_SIZE);
    let response;
    try {
      response = await client
        .from("profiles")
        .select("id, role, active")
        .in("id", batch);
    } catch (error) {
      throw remoteReadError(
        "A tabela public.profiles não pôde ser consultada",
        error,
        "Confirme se a migration de identidade foi aplicada e se a chave server-side tem acesso de leitura.",
      );
    }

    if (response?.error) {
      throw remoteReadError(
        "A tabela public.profiles não pôde ser consultada",
        response.error,
        "Confirme se a migration de identidade foi aplicada e se a chave server-side tem acesso de leitura.",
      );
    }
    if (!Array.isArray(response?.data)) {
      throw new Error("A tabela public.profiles retornou uma resposta inesperada ao validar Auth.");
    }
    profiles.push(...response.data);
  }

  const profilesById = new Map();
  for (const profile of profiles) {
    if (!profile || typeof profile.id !== "string" || profile.id.trim() === "") {
      throw new Error("A tabela public.profiles retornou um registro sem id ao validar Auth.");
    }
    profilesById.set(profile.id, profile);
  }

  const invalidUsers = authUsers.filter((user) => {
    const profile = profilesById.get(user.id);
    return profile?.active !== true || !SUPPORTED_PROFILE_ROLES.includes(profile?.role);
  });

  if (invalidUsers.length > 0) {
    throw new Error(
      `Inconsistência Auth/profiles: ${invalidUsers.length} usuário(s) Auth não possui(em) perfil ativo com role válida ` +
        `(${SUPPORTED_PROFILE_ROLES.join(", ")}). Corrija public.profiles antes da publicação; o smoke é read-only e não fará provisionamento.`,
    );
  }

  return Object.freeze({ profileCount: profiles.length });
}

async function verifyTables(client) {
  for (const table of ESSENTIAL_TABLES) {
    let response;
    try {
      response = await client.from(table).select("*", { head: true });
    } catch (error) {
      throw remoteReadError(
        `A tabela essencial public.${table} não pôde ser consultada`,
        error,
        "Confirme se as migrations versionadas foram aplicadas no projeto de produção.",
      );
    }
    if (response?.error) {
      throw remoteReadError(
        `A tabela essencial public.${table} não pôde ser consultada`,
        response.error,
        "Confirme se as migrations versionadas foram aplicadas no projeto de produção.",
      );
    }
  }
}

function sameMembers(left, right) {
  if (!Array.isArray(left) || left.length !== right.length) return false;
  const normalizedLeft = [...left].map(String).sort();
  const normalizedRight = [...right].map(String).sort();
  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

async function verifyStorage(client) {
  let response;
  try {
    response = await client.storage.listBuckets();
  } catch (error) {
    throw remoteReadError(
      "A API de Storage do Supabase não respondeu",
      error,
      "Confirme a chave server-side e se a Storage API está disponível no projeto.",
    );
  }

  if (response?.error) {
    throw remoteReadError(
      "A API de Storage do Supabase recusou a leitura de buckets",
      response.error,
      "Confirme que a chave usada é server-side e pertence ao projeto informado.",
    );
  }
  if (!Array.isArray(response?.data)) {
    throw new Error("A API de Storage do Supabase retornou uma resposta inesperada ao listar buckets.");
  }

  for (const [name, expected] of Object.entries(REQUIRED_BUCKETS)) {
    const bucket = response.data.find((candidate) => candidate?.id === name || candidate?.name === name);
    if (!bucket) {
      throw new Error(
        `Bucket privado ${name} não encontrado. Aplique a migration de Storage versionada antes da publicação.`,
      );
    }
    if (bucket.public !== false) {
      throw new Error(`Bucket ${name} não está privado; corrija a configuração antes de publicar dados sensíveis.`);
    }
    if (bucket.file_size_limit !== expected.fileSizeLimit) {
      throw new Error(`Bucket ${name} possui limite de tamanho inesperado; esperado ${expected.fileSizeLimit} bytes.`);
    }
    if (!sameMembers(bucket.allowed_mime_types, expected.allowedMimeTypes)) {
      throw new Error(`Bucket ${name} possui tipos MIME permitidos inesperados; revise a migration de Storage.`);
    }
  }
}

export function createAdminClient(config, factory = createSupabaseClient) {
  return factory(config.url, config.serverKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export async function runSupabaseSmoke(config, client) {
  if (!client) throw new Error("O cliente Supabase server-side não foi inicializado.");

  // Todas as chamadas abaixo são leituras. O smoke não cria usuários, linhas,
  // arquivos, migrations ou sessões persistentes.
  const authUsers = await listAuthUsers(client);
  await verifyTables(client);
  const profileResult = await verifyAuthProfiles(client, authUsers);
  await verifyStorage(client);

  return Object.freeze({
    authUserCount: authUsers.length,
    profileCount: profileResult.profileCount,
    tableCount: ESSENTIAL_TABLES.length,
    bucketCount: Object.keys(REQUIRED_BUCKETS).length,
  });
}

export function usage() {
  return [
    "Executa um smoke test read-only do Supabase de produção.",
    "",
    "Obrigatórias:",
    "  SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL",
    "  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "  SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY (server-side)",
    "  VELLORA_AUTH_PROVIDER=supabase",
    "  VELLORA_DATA_PROVIDER=supabase",
    "  VELLORA_STORAGE_PROVIDER=supabase",
    "",
    "A chave server-side nunca deve ser prefixada com NEXT_PUBLIC_ nem versionada.",
    "O smoke não realiza nenhuma operação de escrita.",
  ].join("\n");
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  try {
    const args = parseArgs(argv);
    if (args.help) {
      console.log(usage());
      return 0;
    }

    const config = validateConfig(env);
    const client = createAdminClient(config);
    const result = await runSupabaseSmoke(config, client);

    console.log(`Supabase smoke concluído com sucesso para ${new URL(config.url).hostname}.`);
    console.log(
      `Verificados: Auth Admin API, ${result.tableCount} tabelas essenciais e ${result.bucketCount} buckets privados (sem operações de escrita).`,
    );
    console.log(`Auth/profiles: ${result.authUserCount} usuarios Auth e ${result.profileCount} profiles ativos.`);
    return 0;
  } catch (error) {
    const safeMessage = redactSecrets(error instanceof Error ? error.message : error, environmentSecrets(env));
    console.error(`Supabase smoke não concluído: ${safeMessage}`);
    return 1;
  }
}

const invokedScript = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedScript) {
  const exitCode = await main();
  if (exitCode !== 0) process.exitCode = exitCode;
}
