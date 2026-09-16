import {
  getCaregiverProfile,
  getUserById,
  type ContractOwnerType,
} from "@/lib/data";

export async function validateContractOwner(
  ownerType: ContractOwnerType,
  ownerId: string,
): Promise<{ ok: true } | { ok: false; status: 404 | 400; error: string }> {
  if (ownerType === "family") {
    const user = await getUserById(ownerId);
    if (!user || user.role !== "familia" || user.deleted_at) {
      return { ok: false, status: 404, error: "Conta da família não encontrada." };
    }
    return { ok: true };
  }

  if (ownerType === "caregiver_profile") {
    if (!(await getCaregiverProfile(ownerId))) {
      return { ok: false, status: 404, error: "Cadastro profissional não encontrado." };
    }
    return { ok: true };
  }

  const user = await getUserById(ownerId);
  if (!user || user.role !== "cuidador" || user.deleted_at) {
    return { ok: false, status: 404, error: "Conta do profissional não encontrada." };
  }
  return { ok: true };
}

