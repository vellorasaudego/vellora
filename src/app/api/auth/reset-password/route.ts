import { NextRequest, NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/password-reset";
import { isSafePreview } from "@/lib/preview";
import { consumeRateLimit, isSameOriginRequest } from "@/lib/abuse-prevention";

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
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!token || token.length > 256) {
    return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 400 });
  }
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

  const changed = await resetPasswordWithToken(token, password);
  if (!changed) {
    return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
