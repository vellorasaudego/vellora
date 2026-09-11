import type { CaregiverProfile } from "@/lib/data";
import { CaregiverDirectoryTable } from "@/components/admin/CaregiverDirectoryTable";
import { profileDirectoryEntry } from "@/components/admin/caregiver-directory";

export function CaregiverBank({
  profiles,
}: {
  profiles: CaregiverProfile[];
}) {
  return (
    <CaregiverDirectoryTable
      entries={profiles.map(profileDirectoryEntry)}
      emptyMessage="O banco de profissionais está vazio. Quando uma candidatura for aprovada, o perfil aparecerá aqui automaticamente."
    />
  );
}
