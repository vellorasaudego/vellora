import {
  listCaregiverProfiles,
  listLeads,
  listPatients,
  listProfessionalApplications,
  listUsersByRole,
} from "@/lib/data";
import AdminDashboard from "./AdminDashboard";

export default async function AdminHomePage() {
  const [leads, patients, caregivers, professionalApplications, caregiverUsers] = await Promise.all([
    listLeads(),
    listPatients(),
    listCaregiverProfiles(),
    listProfessionalApplications(),
    listUsersByRole("cuidador"),
  ]);

  return (
    <AdminDashboard
      data={{
        leads,
        patients,
        caregivers,
        professionalApplications,
        caregiverUsers: caregiverUsers.map(({ id, role, deleted_at }) => ({ id, role, deleted_at })),
      }}
      asOf={new Date().toISOString()}
    />
  );
}
