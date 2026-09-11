import type { FamilyUserUpdate } from "./data";
import { normalizedPhoneDigits } from "./validation";

const FAMILY_FIELDS = new Set(["name", "phone"]);

export type ParseFamilyUpdateResult =
  | { ok: true; value: FamilyUserUpdate }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseFamilyUpdate(body: unknown): ParseFamilyUpdateResult {
  if (!isRecord(body)) return { ok: false, error: "Corpo inválido." };

  const unknown = Object.keys(body).filter((key) => !FAMILY_FIELDS.has(key));
  if (unknown.length) return { ok: false, error: `Campo não permitido para edição: ${unknown.join(", ")}.` };
  if (!Object.keys(body).length) return { ok: false, error: "Informe ao menos um campo para editar." };

  const value: FamilyUserUpdate = {};
  if ("name" in body) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return { ok: false, error: "Nome não pode ficar vazio." };
    }
    const name = body.name.trim();
    if (name.length > 120) return { ok: false, error: "Nome deve ter no máximo 120 caracteres." };
    value.name = name;
  }

  if ("phone" in body) {
    if (body.phone === null || body.phone === "") {
      value.phone = null;
    } else if (typeof body.phone !== "string") {
      return { ok: false, error: "Telefone deve ser um texto." };
    } else {
      const phone = body.phone.trim();
      const digits = normalizedPhoneDigits(phone);
      if (digits.length < 10 || digits.length > 15) {
        return { ok: false, error: "Telefone deve conter entre 10 e 15 dígitos." };
      }
      value.phone = phone;
    }
  }

  return { ok: true, value };
}
