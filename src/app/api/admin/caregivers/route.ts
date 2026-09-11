import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import { createUser, getUserByEmail } from "@/lib/data";
import { apiError } from "@/lib/api-error";
import { isValidEmail } from "@/lib/validation";
import { DUPLICATE_ACCOUNT_EMAIL_MESSAGE, isDuplicateAccountEmailError } from "@/lib/user-errors";

export async function POST(req: NextRequest) {
  const guard = await requireRole("admin");
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Nome, e-mail e senha são obrigatórios." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Informe um e-mail de acesso válido." }, { status: 400 });
  }
  if (password.length < 12) {
    return NextResponse.json({ error: "A senha provisória deve ter pelo menos 12 caracteres." }, { status: 400 });
  }
  try {
    if (await getUserByEmail(email.toLowerCase())) {
      return NextResponse.json({ error: DUPLICATE_ACCOUNT_EMAIL_MESSAGE }, { status: 409 });
    }

    const user = await createUser({ name, email, password, role: "cuidador", phone });
    return NextResponse.json({ ok: true, id: user.id });
  } catch (error) {
    if (isDuplicateAccountEmailError(error)) {
      return NextResponse.json({ error: DUPLICATE_ACCOUNT_EMAIL_MESSAGE, code: "email_already_registered" }, { status: 409 });
    }
    return apiError(error, "api/admin/caregivers", "Não foi possível cadastrar o cuidador agora. Tente novamente.");
  }
}
