import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { isSafePreview } from "@/lib/preview";
import { queryOne } from "@/lib/db";
import { runtimeValue } from "@/lib/runtime-config";

const SESSION_COOKIE = "vellora_session";

const ROLE_PREFIX: Record<string, string> = {
  "/admin": "admin",
  "/familia": "familia",
  "/cuidador": "cuidador",
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const matchedPrefix = Object.keys(ROLE_PREFIX).find((p) => pathname.startsWith(p));
  if (!matchedPrefix) return NextResponse.next();

  if (isSafePreview()) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("preview", "segura");
    return NextResponse.redirect(url);
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const secretValue = runtimeValue("VELLORA_SESSION_SECRET");
    if (!secretValue) throw new Error("VELLORA_SESSION_SECRET não configurada.");
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secretValue));
    const requiredRole = ROLE_PREFIX[matchedPrefix];
    if (
      typeof payload.userId !== "string" ||
      typeof payload.sessionVersion !== "number" ||
      payload.role !== requiredRole
    ) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    const user = await queryOne<{ role: string; session_version: number }>(
      "SELECT role, session_version FROM users WHERE id = $1 AND deleted_at IS NULL",
      [payload.userId]
    );
    if (!user || user.role !== requiredRole || user.session_version !== payload.sessionVersion) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  } catch (error) {
    console.error("[proxy] A sessão recebida não pôde ser validada.", {
      error: error instanceof Error ? error.message : "Erro desconhecido",
      pathname,
    });
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/admin/:path*", "/familia/:path*", "/cuidador/:path*"],
};
