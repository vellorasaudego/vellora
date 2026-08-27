import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createSessionToken, SESSION_COOKIE_NAME, roleHomePath } from "@/lib/auth";
import { getAuthProvider } from "@/lib/auth";
import { isSafePreview } from "@/lib/preview";
import { consumeRateLimit, isSameOriginRequest } from "@/lib/abuse-prevention";
import { isValidEmail } from "@/lib/validation";
import {
  applySupabaseCookieState,
  createSupabaseCookieState,
} from "@/lib/supabase/server";
import { signInWithSupabase } from "@/lib/supabase/auth";

export async function POST(req: NextRequest) {
  if (isSafePreview()) {
    return NextResponse.json(
      { error: "Área restrita indisponível nesta prévia sanitizada." },
      { status: 403 }
    );
  }

  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Origem da solicitação não autorizada." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password || !isValidEmail(email)) {
    return NextResponse.json({ error: "Informe e-mail e senha." }, { status: 400 });
  }

  const rate = await consumeRateLimit(req, "auth-login", { limit: 10, windowSeconds: 900 }, email);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  try {
    if (getAuthProvider() === "supabase") {
      const state = createSupabaseCookieState();
      const result = await signInWithSupabase(req, email, password, state);
      if (!result.session) {
        const response = NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
        return applySupabaseCookieState(response, state);
      }

      const response = NextResponse.json({
        ok: true,
        role: result.session.role,
        redirect: roleHomePath(result.session.role),
      });
      return applySupabaseCookieState(response, state);
    }

    const { getUserByEmail } = await import("@/lib/data");
    const user = await getUserByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
    }

    const token = await createSessionToken({
      userId: user.id,
      name: user.name,
      role: user.role,
      sessionVersion: user.session_version,
    });
    const res = NextResponse.json({ ok: true, role: user.role, redirect: roleHomePath(user.role) });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: req.nextUrl.protocol === "https:",
      sameSite: "lax",
      priority: "high",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (error) {
    console.error("[api/auth/login] Não foi possível consultar a conta.", {
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return NextResponse.json(
      { error: "A área restrita está temporariamente indisponível. Tente novamente em instantes." },
      { status: 503 }
    );
  }
}
