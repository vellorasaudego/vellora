import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const PUBLIC_PATHS = Object.freeze([
  "/",
  "/login",
  "/esqueci-senha",
  "/redefinir-senha",
  "/privacidade",
  "/termos",
  "/solicitar-cuidado",
  "/trabalhe-conosco",
]);

export const PROTECTED_PATHS = Object.freeze([
  "/admin",
  "/admin/leads",
  "/admin/profissionais",
  "/familia",
  "/cuidador",
]);

const DEFAULT_BASE_URL = "http://localhost:5173";
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function isLoopbackHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (normalized === "localhost" || normalized === "::1") return true;

  const octets = normalized.split(".");
  return (
    octets.length === 4 &&
    octets[0] === "127" &&
    octets.slice(1).every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
  );
}

export function parseBaseUrl(value = DEFAULT_BASE_URL) {
  const rawValue = typeof value === "string" && value.trim() !== "" ? value.trim() : DEFAULT_BASE_URL;
  let baseUrl;

  try {
    baseUrl = new URL(rawValue);
  } catch {
    throw new Error("VELLORA_BASE_URL deve ser uma URL válida.");
  }

  if (!ALLOWED_PROTOCOLS.has(baseUrl.protocol)) {
    throw new Error("VELLORA_BASE_URL deve usar HTTP ou HTTPS.");
  }
  if (baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
    throw new Error("VELLORA_BASE_URL não pode conter credenciais, query string ou fragmento.");
  }
  if (baseUrl.pathname !== "" && baseUrl.pathname !== "/") {
    throw new Error("VELLORA_BASE_URL deve apontar para o origin, sem um pathname adicional.");
  }
  if (baseUrl.protocol === "http:" && !isLoopbackHostname(baseUrl.hostname)) {
    throw new Error("HTTP só é aceito para hosts de loopback; use HTTPS para hosts remotos.");
  }

  return new URL(baseUrl.origin);
}

function pathUrl(baseUrl, pathname) {
  return new URL(pathname, baseUrl);
}

async function closeResponseBody(response) {
  if (response.body) await response.body.cancel();
}

async function fetchRoute(baseUrl, pathname) {
  try {
    return await fetch(pathUrl(baseUrl, pathname), {
      credentials: "omit",
      method: "GET",
      redirect: "manual",
    });
  } catch {
    throw new Error(`Erro de rede ao consultar ${pathname}.`);
  }
}

function printStatus(pathname, response) {
  console.log(`[${response.status}] ${pathname}`);
}

async function assertPublicRoute(baseUrl, pathname) {
  const response = await fetchRoute(baseUrl, pathname);
  printStatus(pathname, response);
  await closeResponseBody(response);

  if (response.status !== 200) {
    throw new Error(`Status inesperado em ${pathname}: esperado 200, recebido ${response.status}.`);
  }
}

function validateLoginLocation(baseUrl, pathname, response) {
  const location = response.headers.get("location");
  if (!location) {
    throw new Error(`Redirect inválido em ${pathname}: Location ausente.`);
  }

  let redirectUrl;
  try {
    redirectUrl = new URL(location, pathUrl(baseUrl, pathname));
  } catch {
    throw new Error(`Redirect inválido em ${pathname}: Location não é uma URL válida.`);
  }

  if (
    !ALLOWED_PROTOCOLS.has(redirectUrl.protocol) ||
    redirectUrl.origin !== baseUrl.origin ||
    redirectUrl.pathname !== "/login" ||
    redirectUrl.username ||
    redirectUrl.password
  ) {
    throw new Error(`Redirect inválido em ${pathname}: Location deve apontar para /login no mesmo origin.`);
  }
}

async function assertProtectedRoute(baseUrl, pathname) {
  const response = await fetchRoute(baseUrl, pathname);
  printStatus(pathname, response);
  if (response.status !== 307 && response.status !== 308) {
    await closeResponseBody(response);
    throw new Error(`Status inesperado em ${pathname}: esperado 307 ou 308, recebido ${response.status}.`);
  }

  validateLoginLocation(baseUrl, pathname, response);
  await closeResponseBody(response);
}

export async function runRouteSmoke(baseUrl) {
  for (const pathname of PUBLIC_PATHS) {
    await assertPublicRoute(baseUrl, pathname);
  }
  for (const pathname of PROTECTED_PATHS) {
    await assertProtectedRoute(baseUrl, pathname);
  }
}

export function usage() {
  return [
    "Valida o contrato HTTP mínimo da aplicação sem autenticação ou operações de escrita.",
    "",
    "Uso:",
    "  VELLORA_BASE_URL=http://localhost:5173 npm run route:smoke",
    "",
    "A base padrão é http://localhost:5173. HTTP remoto é rejeitado; hosts remotos devem usar HTTPS.",
  ].join("\n");
}

export async function main(env = process.env, argv = process.argv.slice(2)) {
  try {
    if (argv.length > 0) {
      if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h")) {
        console.log(usage());
        return 0;
      }
      throw new Error("Este smoke test não aceita argumentos; configure VELLORA_BASE_URL.");
    }

    const baseUrl = parseBaseUrl(env.VELLORA_BASE_URL);
    console.log(`Route smoke base: ${baseUrl.origin}`);

    await runRouteSmoke(baseUrl);
    console.log("Route smoke concluído com sucesso.");
    return 0;
  } catch (error) {
    console.error(`Route smoke não concluído: ${error instanceof Error ? error.message : "erro inesperado."}`);
    return 1;
  }
}

const invokedScript = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedScript) {
  const exitCode = await main();
  if (exitCode !== 0) process.exitCode = exitCode;
}
