import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

export const SUPPORTED_ROLES = Object.freeze(["admin", "familia", "cuidador"]);

const MAX_NAME_LENGTH = 120;
const MAX_PHONE_LENGTH = 40;
const MIN_PASSWORD_LENGTH = 12;
const USERS_PAGE_SIZE = 1000;
const MAX_USER_PAGES = 1000;

const ARGUMENTS = Object.freeze({
  "--url": "url",
  "--email": "email",
  "--name": "name",
  "--password": "password",
  "--role": "role",
  "--phone": "phone",
  "--secret-key": "secretKey",
  "--service-role-key": "serviceRoleKey",
});

function firstNonEmpty(...values) {
  return values.find((value) => typeof value === "string" && value.trim() !== "")?.trim() ?? "";
}

function firstPassword(...values) {
  return values.find((value) => typeof value === "string" && value.length > 0) ?? "";
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function normalizeRole(role) {
  return role.trim().toLowerCase();
}

function assertUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("SUPABASE_URL deve ser uma URL válida.");
  }

  const localHost = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(localHost && parsed.protocol === "http:")) {
    throw new Error("SUPABASE_URL deve usar HTTPS; HTTP só é permitido para loopback local.");
  }
}

function readKey(args, env) {
  const candidates = [
    ["--secret-key", args.secretKey],
    ["--service-role-key", args.serviceRoleKey],
    ["SUPABASE_SECRET_KEY", env.SUPABASE_SECRET_KEY],
    ["SUPABASE_SERVICE_ROLE_KEY", env.SUPABASE_SERVICE_ROLE_KEY],
  ].filter(([, value]) => typeof value === "string" && value.trim() !== "");

  if (candidates.length > 1) {
    throw new Error("Defina somente uma chave server-side: secret key ou service role key.");
  }

  return candidates[0]?.[1]?.trim() ?? "";
}

export function parseArgs(argv) {
  const values = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      values.help = true;
      continue;
    }
    if (argument === "--reset-password") {
      values.resetPassword = true;
      continue;
    }
    if (!argument.startsWith("--")) {
      throw new Error("Argumentos posicionais não são aceitos; use --help para ver as opções.");
    }

    const separatorIndex = argument.indexOf("=");
    const option = separatorIndex === -1 ? argument : argument.slice(0, separatorIndex);
    const inlineValue = separatorIndex === -1 ? undefined : argument.slice(separatorIndex + 1);
    const property = ARGUMENTS[option];
    if (!property) {
      throw new Error("Opção não suportada; use --help para ver as opções.");
    }
    if (Object.hasOwn(values, property)) {
      throw new Error("Cada opção só pode ser informada uma vez.");
    }

    const value = inlineValue ?? argv[index + 1];
    if (value === undefined || value === "" || (inlineValue === undefined && value.startsWith("--"))) {
      throw new Error("Há uma opção sem valor; use --help para ver as opções.");
    }
    if (inlineValue === undefined) {
      index += 1;
    }
    values[property] = value;
  }

  return values;
}

export function validateConfig(input) {
  const config = {
    url: typeof input.url === "string" ? input.url.trim() : "",
    secretKey: typeof input.secretKey === "string" ? input.secretKey.trim() : "",
    email: typeof input.email === "string" ? normalizeEmail(input.email) : "",
    name: typeof input.name === "string" ? input.name.trim() : "",
    password: typeof input.password === "string" ? input.password : "",
    role: typeof input.role === "string" ? normalizeRole(input.role) : "",
    phone: typeof input.phone === "string" && input.phone.trim() !== "" ? input.phone.trim() : null,
    resetPassword: input.resetPassword === true,
  };
  const missing = [];

  if (!config.url) missing.push("SUPABASE_URL");
  if (!config.secretKey) missing.push("SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY");
  if (!config.email) missing.push("SUPABASE_PROVISION_EMAIL ou --email");
  if (!config.name) missing.push("SUPABASE_PROVISION_NAME ou --name");
  if (!config.password) missing.push("SUPABASE_PROVISION_PASSWORD ou --password");
  if (!config.role) missing.push("SUPABASE_PROVISION_ROLE ou --role");
  if (missing.length > 0) {
    throw new Error(`Variáveis/opções obrigatórias ausentes: ${missing.join(", ")}.`);
  }

  assertUrl(config.url);
  if (!/^\S+@\S+\.\S+$/.test(config.email) || config.email.length > 320) {
    throw new Error("O e-mail informado não é válido.");
  }
  if (config.name.length > MAX_NAME_LENGTH) {
    throw new Error(`O nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres.`);
  }
  if (config.password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
  if (!SUPPORTED_ROLES.includes(config.role)) {
    throw new Error(`Role inválido; use uma destas opções: ${SUPPORTED_ROLES.join(", ")}.`);
  }
  if (config.phone && config.phone.length > MAX_PHONE_LENGTH) {
    throw new Error(`O telefone deve ter no máximo ${MAX_PHONE_LENGTH} caracteres.`);
  }

  return config;
}

export function resolveConfig(args, env = process.env) {
  return validateConfig({
    url: firstNonEmpty(args.url, env.SUPABASE_URL),
    secretKey: readKey(args, env),
    email: firstNonEmpty(args.email, env.SUPABASE_PROVISION_EMAIL),
    name: firstNonEmpty(args.name, env.SUPABASE_PROVISION_NAME),
    password: firstPassword(args.password, env.SUPABASE_PROVISION_PASSWORD),
    role: firstNonEmpty(args.role, env.SUPABASE_PROVISION_ROLE),
    phone: firstNonEmpty(args.phone, env.SUPABASE_PROVISION_PHONE),
    resetPassword: args.resetPassword === true || env.SUPABASE_PROVISION_RESET_PASSWORD === "true",
  });
}

function errorCode(error) {
  return typeof error?.code === "string" && error.code.trim() !== "" ? ` (código ${error.code})` : "";
}

function remoteError(operation, error) {
  return new Error(`${operation}${errorCode(error)}. Verifique a URL e a chave server-side e tente novamente.`);
}

function userEmail(user) {
  return typeof user?.email === "string" ? normalizeEmail(user.email) : "";
}

async function findUsersByEmail(client, email) {
  const matches = [];

  for (let page = 1; page <= MAX_USER_PAGES; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: USERS_PAGE_SIZE,
    });
    if (error) {
      throw remoteError("Falha ao listar usuários do Supabase Auth", error);
    }

    const users = Array.isArray(data?.users) ? data.users : [];
    matches.push(...users.filter((user) => userEmail(user) === email));
    if (users.length < USERS_PAGE_SIZE) {
      return matches;
    }
  }

  throw new Error("Não foi possível concluir a listagem de usuários: paginação excedeu o limite de segurança.");
}

function singleUserOrThrow(users) {
  if (users.length > 1) {
    throw new Error("Conflito de e-mail: há mais de uma conta Auth com o mesmo e-mail normalizado; nenhuma alteração foi feita.");
  }
  const user = users[0] ?? null;
  if (user?.deleted_at) {
    throw new Error("A conta Auth encontrada está marcada como removida; restaure-a no painel antes de provisionar novamente.");
  }
  return user;
}

async function createOrReuseUser(client, config) {
  const existing = singleUserOrThrow(await findUsersByEmail(client, config.email));
  if (existing) {
    const attributes = { email_confirm: true };
    if (config.resetPassword) {
      attributes.password = config.password;
    }
    const { data, error } = await client.auth.admin.updateUserById(existing.id, attributes);
    if (error) {
      throw remoteError("Falha ao atualizar a conta existente no Supabase Auth", error);
    }
    return {
      user: data?.user ?? data ?? existing,
      action: "reutilizada e atualizada",
      passwordUpdated: config.resetPassword,
    };
  }

  const { data, error } = await client.auth.admin.createUser({
    email: config.email,
    password: config.password,
    email_confirm: true,
  });
  if (!error) {
    const user = data?.user ?? data;
    if (!user?.id) {
      throw new Error("O Supabase Auth não retornou o identificador da conta criada; verifique o painel antes de repetir.");
    }
    return { user, action: "criada", passwordUpdated: true };
  }

  // Se duas execuções ocorrerem juntas, a segunda pode receber conflito de e-mail.
  // Reconsultar permite concluir de forma idempotente sem esconder conflitos reais.
  const afterRace = singleUserOrThrow(await findUsersByEmail(client, config.email));
  if (!afterRace) {
    throw remoteError("Falha ao criar a conta no Supabase Auth", error);
  }
  const attributes = { email_confirm: true };
  if (config.resetPassword) {
    attributes.password = config.password;
  }
  const { data: updatedData, error: updateError } = await client.auth.admin.updateUserById(afterRace.id, attributes);
  if (updateError) {
    throw remoteError("A conta foi criada em paralelo, mas não pôde ser atualizada", updateError);
  }
  return {
    user: updatedData?.user ?? updatedData ?? afterRace,
    action: "encontrada após uma execução concorrente e atualizada",
    passwordUpdated: config.resetPassword,
  };
}

async function syncProfile(client, user, config) {
  const { error } = await client.from("profiles").upsert(
    {
      id: user.id,
      name: config.name,
      phone: config.phone,
      role: config.role,
      active: true,
    },
    { onConflict: "id" },
  );
  if (error) {
    throw remoteError("A conta Auth está disponível, mas o perfil public.profiles não pôde ser sincronizado", error);
  }
}

export async function provisionSupabaseUser(input) {
  const config = validateConfig(input);
  const client = createClient(config.url, config.secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  const result = await createOrReuseUser(client, config);
  await syncProfile(client, result.user, config);

  return {
    userId: result.user.id,
    email: config.email,
    role: config.role,
    action: result.action,
    passwordUpdated: result.passwordUpdated,
  };
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
    .replace(/(secret(?:[_ -]?key)?|service[_ -]?role[_ -]?key|password)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .replace(/\b(?:sb_(?:secret|service_role)_[A-Za-z0-9._-]+|eyJ[A-Za-z0-9._-]{20,})\b/g, "[redacted]");
}

export function usage() {
  return [
    "Provisiona ou reconcilia um usuário Supabase Auth e seu public.profiles.",
    "",
    "Preferência: forneça os valores por variáveis de ambiente, não pela linha de comando.",
    "Obrigatórios: SUPABASE_URL, SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY,",
    "SUPABASE_PROVISION_EMAIL, SUPABASE_PROVISION_NAME, SUPABASE_PROVISION_PASSWORD e",
    "SUPABASE_PROVISION_ROLE (admin, familia ou cuidador).",
    "",
    "Opções: --url, --email, --name, --password, --role, --phone, --secret-key,",
    "--service-role-key, --reset-password e --help.",
    "",
    "Por segurança, uma reexecução não troca a senha existente por padrão; use",
    "--reset-password somente quando a rotação da senha foi intencional.",
  ].join("\n");
}

function environmentSecrets(env = process.env) {
  return [
    env.SUPABASE_SECRET_KEY,
    env.SUPABASE_SERVICE_ROLE_KEY,
    env.SUPABASE_PROVISION_PASSWORD,
  ].filter(Boolean);
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  let args;
  try {
    args = parseArgs(argv);
    if (args.help) {
      console.log(usage());
      return 0;
    }
    const config = resolveConfig(args, env);
    const result = await provisionSupabaseUser(config);
    console.log(`Provisionamento concluído: conta ${result.action} para ${result.email}; role ${result.role}; perfil ativo sincronizado.`);
    if (result.passwordUpdated) {
      console.log("A senha foi definida/rotacionada conforme a entrada explícita do comando.");
    } else {
      console.log("A senha existente foi preservada; use --reset-password apenas para uma rotação intencional.");
    }
    return 0;
  } catch (error) {
    const suppliedSecrets = [
      ...environmentSecrets(env),
      args?.password,
      args?.secretKey,
      args?.serviceRoleKey,
    ].filter(Boolean);
    console.error(`Provisionamento não concluído: ${redactSecrets(error instanceof Error ? error.message : error, suppliedSecrets)}`);
    return 1;
  }
}

const invokedScript = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedScript) {
  const exitCode = await main();
  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
}
