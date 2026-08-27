import Link from "next/link";
import { listUsersByRole, listLeads } from "@/lib/data";
import { NewPatientForm } from "@/components/admin/NewPatientForm";

export default async function NewPatientPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const leadId = typeof params.lead === "string" ? params.lead : undefined;
  const [leads, familyUsers] = await Promise.all([listLeads(), listUsersByRole("familia")]);
  const lead = leadId ? leads.find((l) => l.id === leadId) : undefined;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/pacientes" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        ← Pacientes
      </Link>
      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Cadastrar novo paciente</h2>
        {lead && (
          <p className="mt-1 text-sm text-[var(--muted)]">
            Convertendo o contato de <strong>{lead.name}</strong> ({lead.email}).
          </p>
        )}
        <div className="mt-6">
          <NewPatientForm
            familyUsers={familyUsers}
            leadId={lead?.id}
            defaults={
              lead
                ? {
                    patientName: lead.patient_name || undefined,
                    familyName: lead.name,
                    familyEmail: lead.email,
                    familyPhone: lead.phone,
                    careType: lead.care_type || undefined,
                    message: lead.message || undefined,
                  }
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
