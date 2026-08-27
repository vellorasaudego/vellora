import { NextRequest, NextResponse } from "next/server";
import { getAuthProvider } from "@/lib/auth";
import { isSafePreview } from "@/lib/preview";
import { consumeRateLimit, isSameOriginRequest } from "@/lib/abuse-prevention";
import {
  applySupabaseCookieState,
  createSupabaseCookieState,
} from "@/lib/supabase/server";
import { updateSupabasePassword } from "@/lib/supabase/auth";

export async function POST(req: NextRequest) {
  if (isSafePreview()) {
    return NextResponse.json(
      { error: "A redefinição real está desativada nesta prévia segura." },
      { status: 403 }
    );
  }

  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Origem da solicitação não autorizada." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (password.length < 12 || password.length > 128) {
    return NextResponse.json(
      { error: "A nova senha deve ter entre 12 e 128 caracteres." },
      { status: 400 }
    );
  }

  const rate = await consumeRateLimit(req, "auth-reset-password", { limit: 8, windowSeconds: 900 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  if (getAuthProvider() === "supabase") {
    try {
      const state = createSupabaseCookieState();
      const result = await updateSupabasePassword(req, password, state);
      if (!result.ok) {
        return applySupabaseCookieState(
          NextResponse.json({ error: "Link inválido ou expirado." }, { status: 400 }),
          state,
        );
      }
      return applySupabaseCookieState(NextResponse.json({ ok: true }), state);
    } catch (error) {
      console.error("[api/auth/reset-password] Configuração Supabase indisponível.", {
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
      return NextResponse.json(
        { error: "A redefinição está temporariamente indisponível. Tente novamente mais tarde." },
        { status: 503 },
      );
    }
  }

  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token || token.length > 256) {
    return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 400 });
  }

  const { resetPasswordWithToken } = await import("@/lib/password-reset");
  const changed = await resetPasswordWithToken(token, password);
  if (!changed) {
    return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
