import { NextResponse } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Returns whether a request is a state-changing request handled by an admin
 * API route. Non-browser clients that use GET/HEAD/OPTIONS are intentionally
 * left untouched here; the route's authentication/authorization remains the
 * source of truth for access control.
 */
export function isAdminMutationRequest(
  request: Pick<Request, "method" | "url">,
): boolean {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) return false;

  try {
    const pathname = new URL(request.url).pathname;
    return pathname === "/api/admin" || pathname.startsWith("/api/admin/");
  } catch {
    return false;
  }
}

function sameOrigin(value: string, requestOrigin: string): boolean {
  try {
    return new URL(value).origin === requestOrigin;
  } catch {
    return false;
  }
}

/**
 * Returns an error message when the request cannot be attributed to this
 * origin. Missing Origin/Referer/Fetch-Metadata headers are allowed so that
 * server-to-server and older legitimate clients keep working. When a browser
 * supplies those signals, contradictory or cross-site values are rejected.
 */
export function adminMutationSecurityError(
  request: Pick<Request, "method" | "url" | "headers">,
): string | null {
  if (!isAdminMutationRequest(request)) return null;

  let requestOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    return "A origem da solicitação não pôde ser validada.";
  }

  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (fetchSite === "cross-site") {
    return "Origem da solicitação não autorizada.";
  }

  const origin = request.headers.get("origin")?.trim();
  if (origin && !sameOrigin(origin, requestOrigin)) {
    return "Origem da solicitação não autorizada.";
  }

  const referer = request.headers.get("referer")?.trim();
  if (referer && !sameOrigin(referer, requestOrigin)) {
    return "Origem da solicitação não autorizada.";
  }

  return null;
}

/**
 * Proxy entry point for the common origin/Fetch Metadata boundary. It only
 * rejects a request when a supplied browser signal proves it is cross-origin;
 * the route still performs authentication and role checks afterwards.
 */
export function enforceAdminMutationSecurity(
  request: Pick<Request, "method" | "url" | "headers">,
): NextResponse | null {
  const error = adminMutationSecurityError(request);
  if (!error) return null;

  const response = NextResponse.json({ error }, { status: 403 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
