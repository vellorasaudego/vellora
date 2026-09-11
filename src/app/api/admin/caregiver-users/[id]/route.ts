import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import {
  deleteCaregiverUser,
  getCaregiverProfileByUserId,
  getUserById,
  updateCaregiverUser,
} from "@/lib/data";
import { apiError } from "@/lib/api-error";
import { isValidCaregiverId, parseCaregiverUserUpdate } from "@/lib/caregiver-update";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole("admin");
  if ("error" in guard) return guard.error;

  const { id } = await params;
  if (!isValidCaregiverId(id)) {
    return NextResponse.json({ error: "Identificador do cuidador inválido." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = parseCaregiverUserUpdate(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const caregiver = await getUserById(id);
    if (!caregiver || caregiver.role !== "cuidador" || caregiver.deleted_at) {
      return NextResponse.json({ error: "Cadastro manual de cuidador não encontrado." }, { status: 404 });
    }
    if (await getCaregiverProfileByUserId(id)) {
      return NextResponse.json({ error: "Este cuidador possui um perfil aprovado; use a página de perfil." }, { status: 404 });
    }
    await updateCaregiverUser(id, parsed.value);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "api/admin/caregiver-users/[id]", "Não foi possível salvar os dados do cuidador.");
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole("admin");
  if ("error" in guard) return guard.error;

  const { id } = await params;
  try {
    await deleteCaregiverUser(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "api/admin/caregiver-users", "Não foi possível excluir a conta do cuidador.");
  }
}
