import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import { deleteFamilyUser } from "@/lib/data";
import { apiError } from "@/lib/api-error";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole("admin");
  if ("error" in guard) return guard.error;

  const { id } = await params;
  try {
    await deleteFamilyUser(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "api/admin/families", "Não foi possível excluir a conta da família.");
  }
}
