-- Allow an active assigned caregiver to read the complete patient history.
-- Insert, update, delete, audit, and administrative policies remain unchanged.
alter policy daily_records_select_authorized
on public.daily_records
using (
  (select private.is_admin())
  or (select private.is_patient_family(patient_id))
  or (select private.is_active_caregiver(patient_id))
);
