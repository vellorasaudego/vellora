import { NextRequest, NextResponse } from "next/server";
import { getAuthProvider } from "@/lib/auth";
import { isSafePreview } from "@/lib/preview";
import { consumeRateLimit, isSameOriginRequest } from "@/lib/abuse-prevention";
import { isValidEmail } from "@/lib/validation";
import {
  getSupabasePasswordResetRedirectUrl,
  requestSupabasePasswordReset,
} from "@/lib/supabase/auth";

const GENERIC_MESSAGE =
  "Se houver uma conta com este e-mail, enviaremos as instruções para criar uma nova senha.";

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Origem da solicitação não autorizada." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }

  const rate = await consumeRateLimit(req, "auth-forgot-password", { limit: 5, windowSeconds: 900 }, email);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Muitas solicitações em pouco tempo. Aguarde alguns minutos e tente novamente." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  if (isSafePreview()) {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }

  if (getAuthProvider() === "supabase") {
    try {
      const error = await requestSupabasePasswordReset(
        email,
        getSupabasePasswordResetRedirectUrl(req.url),
      );
      if (error) {
        console.error("[api/auth/forgot-password] Não foi possível solicitar recuperação Supabase.", {
          error: error.message,
        });
        return NextResponse.json(
          { error: "A recuperação por e-mail está temporariamente indisponível. Tente novamente mais tarde." },
          { status: 503 },
        );
      }
      return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
    } catch (error) {
      console.error("[api/auth/forgot-password] Configuração Supabase indisponível.", {
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
      return NextResponse.json(
        { error: "A recuperação por e-mail está temporariamente indisponível. Tente novamente mais tarde." },
        { status: 503 },
      );
    }
  }

  const { getUserByEmail } = await import("@/lib/data");
  const { createPasswordResetToken, discardPasswordResetToken } = await import("@/lib/password-reset");
  const { isPasswordEmailConfigured, sendPasswordResetEmail } = await import("@/lib/email");

  if (!isPasswordEmailConfigured()) {
    return NextResponse.json(
      {
        error:
          "A recuperação por e-mail está temporariamente indisponível. Fale com a equipe da Vellora Saúde.",
      },
      { status: 503 }
    );
  }

  try {
    const user = await getUserByEmail(email);
    if (user) {
      const reset = await createPasswordResetToken(user.id);
      if (reset) {
        try {
          await sendPasswordResetEmail({
            to: user.email,
            token: reset.token,
            requestId: reset.id,
          });
        } catch {
          await discardPasswordResetToken(reset.id);
          console.error("Não foi possível enviar um e-mail de recuperação de senha.");
        }
      }
    }
  } catch {
    console.error("Não foi possível processar uma solicitação de recuperação de senha.");
  }

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}
