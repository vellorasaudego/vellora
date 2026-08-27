import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import { createUser, getUserByEmail } from "@/lib/data";

export async function POST(req: NextRequest) {
  const guard = await requireRole("admin");
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);
  const name = (body?.name || "").trim();
  const email = (body?.email || "").trim();
  const password = body?.password || "";
  const phone = (body?.phone || "").trim();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Nome, e-mail e senha são obrigatórios." }, { status: 400 });
  }
  if (password.length < 12) {
    return NextResponse.json({ error: "A senha provisória deve ter pelo menos 12 caracteres." }, { status: 400 });
  }
  if (await getUserByEmail(email.toLowerCase())) {
    return NextResponse.json({ error: "Já existe um usuário com esse e-mail." }, { status: 400 });
  }

  const user = await createUser({ name, email, password, role: "cuidador", phone });
  return NextResponse.json({ ok: true, id: user.id });
}
