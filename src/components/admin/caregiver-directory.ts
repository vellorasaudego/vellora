import type { CaregiverProfile, User } from "@/lib/data";

export const DAY_LABELS: Record<string, string> = {
  segunda: "Segunda-feira",
  terca: "Terça-feira",
  quarta: "Quarta-feira",
  quinta: "Quinta-feira",
  sexta: "Sexta-feira",
  sabado: "Sábado",
  domingo: "Domingo",
};

export const SHORT_DAY_LABELS: Record<string, string> = {
  segunda: "Seg",
  terca: "Ter",
  quarta: "Qua",
  quinta: "Qui",
  sexta: "Sex",
  sabado: "Sáb",
  domingo: "Dom",
};

export const SHIFT_LABELS: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
  plantao_12h_diurno: "12h diurno",
  plantao_12h_noturno: "12h noturno",
  plantao_24h: "24h",
};

export const PROFESSION_LABELS: Record<CaregiverProfile["profession"], string> = {
  cuidador: "Cuidador(a)",
  tecnico_enfermagem: "Técnico(a) de enfermagem",
  enfermeiro: "Enfermeiro(a)",
  outros: "Outros",
};

export type CaregiverDirectoryEntry = {
  id: string;
  name: string;
  phone: string | null;
  profession: string;
  status: string;
  href: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidCaregiverId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function profileDirectoryEntry(profile: CaregiverProfile): CaregiverDirectoryEntry {
  return {
    id: profile.id,
    name: profile.name,
    phone: profile.phone,
    profession: PROFESSION_LABELS[profile.profession],
    status: profile.account_status,
    href: `/admin/cuidadores/perfil/${profile.id}`,
  };
}

export function manualAccountDirectoryEntry(
  caregiver: Pick<User, "id" | "name" | "phone">,
): CaregiverDirectoryEntry {
  return {
    id: caregiver.id,
    name: caregiver.name,
    phone: caregiver.phone,
    profession: PROFESSION_LABELS.cuidador,
    status: "ativo",
    href: `/admin/cuidadores/conta/${caregiver.id}`,
  };
}
