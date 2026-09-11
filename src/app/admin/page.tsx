import { listCaregiverProfiles, listLeads, listPatients, listProfessionalApplications } from "@/lib/data";
import AdminDashboard from "./AdminDashboard";

export default async function AdminHomePage() {
  const [leads, patients, caregivers, professionalApplications] = await Promise.all([
    listLeads(),
    listPatients(),
    listCaregiverProfiles(),
    listProfessionalApplications(),
  ]);

  return (
    <AdminDashboard
      data={{ leads, patients, caregivers, professionalApplications }}
      asOf={new Date().toISOString()}
    />
  );
}
