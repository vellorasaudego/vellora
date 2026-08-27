import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import { updatePatient, createUser, deletePatient, getUserByEmail } from "@/lib/data";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole("admin");
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  let familyUserId: string | undefined = body.family_user_id;

  if (!familyUserId && body.new_family_name && body.new_family_email && body.new_family_password) {
    if (body.new_family_password.length < 12) {
      return NextResponse.json({ error: "A senha provisória deve ter pelo menos 12 caracteres." }, { status: 400 });
    }
    const existing = await getUserByEmail(body.new_family_email.toLowerCase().trim());
    if (existing) {
      return NextResponse.json({ error: "Já existe um usuário com esse e-mail de família." }, { status: 400 });
    }
    const familyUser = await createUser({
      name: body.new_family_name.trim(),
      email: body.new_family_email.trim(),
      password: body.new_family_password,
      role: "familia",
      phone: body.new_family_phone?.trim(),
    });
    familyUserId = familyUser.id;
  }

  await updatePatient(id, {
    name: body.name,
    birth_date: body.birth_date,
    address: body.address,
    care_level: body.care_level,
    condition_summary: body.condition_summary,
    status: body.status,
    notes: body.notes,
    ...(familyUserId ? { family_user_id: familyUserId } : {}),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole("admin");
  if ("error" in guard) return guard.error;

  const { id } = await params;
  await deletePatient(id);
  return NextResponse.json({ ok: true });
}
