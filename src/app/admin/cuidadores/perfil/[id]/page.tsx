import { notFound } from "next/navigation";
import {
  getCaregiverProfile,
  listContractDocuments,
  listPatientsByCaregiver,
} from "@/lib/data";
import { CaregiverProfileDetails } from "@/components/admin/CaregiverProfileDetails";
import { isValidCaregiverId } from "@/components/admin/caregiver-directory";

export default async function AdminCaregiverProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isValidCaregiverId(id)) notFound();

  const profile = await getCaregiverProfile(id);
  if (!profile) notFound();

  const [patients, contracts] = await Promise.all([
    profile.user_id ? listPatientsByCaregiver(profile.user_id) : Promise.resolve([]),
    listContractDocuments("caregiver_profile", profile.id),
  ]);

  return <CaregiverProfileDetails profile={profile} patients={patients} contracts={contracts} />;
}
