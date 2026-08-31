"use client";

import { ChangeEvent, KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import {
  CARE_PLAN_OPTIONS,
  calculateCustomDuration,
  CUSTOM_CARE_PLAN_OPTION,
  CustomCarePlanSchedule,
  formatDuration,
  isStandardCarePlan,
  LEGACY_CARE_PLAN_OPTION,
  resolveCarePlanInitialState,
  serializeCustomCarePlan,
  validateCustomCarePlanSchedule,
  CarePlanSelection,
} from "./care-plan";

const EMPTY_SCHEDULE: CustomCarePlanSchedule = { start: "", end: "" };

type DraftScheduleSetter = (updater: (current: CustomCarePlanSchedule) => CustomCarePlanSchedule) => void;

export function handleCarePlanTimeChange(
  setDraftSchedule: DraftScheduleSetter,
  field: keyof CustomCarePlanSchedule,
  event: ChangeEvent<HTMLInputElement>,
) {
  const value = event.currentTarget.value;
  setDraftSchedule((current) => ({ ...current, [field]: value }));
}

export function CarePlanField({
  name = "care_level",
  initialValue,
  preserveLegacy = false,
  id,
}: {
  name?: string;
  initialValue?: string | null;
  preserveLegacy?: boolean;
  id?: string;
}) {
  const generatedId = useId().replace(/:/g, "");
  const fieldId = id || `care-plan-${generatedId}`;
  const selectionName = `${name}_option`;
  const helpId = `${fieldId}-help`;
  const dialogId = `${fieldId}-dialog`;
  const dialogTitleId = `${dialogId}-title`;
  const dialogDescriptionId = `${dialogId}-description`;
  const dialogErrorId = `${dialogId}-error`;
  const durationId = `${dialogId}-duration`;
  const startId = `${dialogId}-start`;
  const endId = `${dialogId}-end`;

  const [initialState] = useState(() => resolveCarePlanInitialState(initialValue, preserveLegacy));
  const [selectedOption, setSelectedOption] = useState<CarePlanSelection>(initialState.selection);
  const [storedValue, setStoredValue] = useState(initialState.storedValue);
  const [customSchedule, setCustomSchedule] = useState<CustomCarePlanSchedule | null>(initialState.customSchedule);
  const [draftSchedule, setDraftSchedule] = useState<CustomCarePlanSchedule>(initialState.customSchedule || EMPTY_SCHEDULE);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);
  const dialogTriggerRef = useRef<HTMLElement | null>(null);
  const selectionBeforeDialogRef = useRef<CarePlanSelection>(initialState.selection);
  const storedValueBeforeDialogRef = useRef(initialState.storedValue);

  const savedCustomDuration = customSchedule ? calculateCustomDuration(customSchedule.start, customSchedule.end) : null;
  const draftDuration = calculateCustomDuration(draftSchedule.start, draftSchedule.end);

  useEffect(() => {
    if (!dialogOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    startTimeRef.current?.focus();

    return () => {
      if (dialog.open) dialog.close();
      dialogTriggerRef.current?.focus();
    };
  }, [dialogOpen]);

  function openCustomScheduleDialog(trigger: HTMLElement) {
    selectionBeforeDialogRef.current = selectedOption;
    storedValueBeforeDialogRef.current = storedValue;
    dialogTriggerRef.current = trigger;
    setDraftSchedule(customSchedule || EMPTY_SCHEDULE);
    setDialogError(null);
    setSelectedOption(CUSTOM_CARE_PLAN_OPTION);
    setDialogOpen(true);
  }

  function handleSelectionChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextOption = event.currentTarget.value as CarePlanSelection;
    if (nextOption === CUSTOM_CARE_PLAN_OPTION) {
      openCustomScheduleDialog(event.currentTarget);
      return;
    }

    if (nextOption === LEGACY_CARE_PLAN_OPTION && initialState.legacyValue !== null) {
      setSelectedOption(nextOption);
      setStoredValue(initialState.legacyValue);
      return;
    }

    if (isStandardCarePlan(nextOption)) {
      setSelectedOption(nextOption);
      setStoredValue(nextOption);
    }
  }

  function cancelCustomScheduleDialog() {
    setSelectedOption(selectionBeforeDialogRef.current);
    setStoredValue(storedValueBeforeDialogRef.current);
    setDialogError(null);
    setDialogOpen(false);
  }

  function saveCustomSchedule() {
    const validation = validateCustomCarePlanSchedule(draftSchedule.start, draftSchedule.end);
    if (!validation.valid) {
      setDialogError(validation.message);
      if (validation.focus === "end") endTimeRef.current?.focus();
      else startTimeRef.current?.focus();
      return;
    }

    const serializedValue = serializeCustomCarePlan(draftSchedule);
    if (serializedValue === null) {
      setDialogError("Informe um intervalo válido para salvar o horário personalizado.");
      startTimeRef.current?.focus();
      return;
    }

    setCustomSchedule({ ...draftSchedule });
    setStoredValue(serializedValue);
    setSelectedOption(CUSTOM_CARE_PLAN_OPTION);
    setDialogError(null);
    setDialogOpen(false);
  }

  function handleTimeChange(field: keyof CustomCarePlanSchedule, event: ChangeEvent<HTMLInputElement>) {
    handleCarePlanTimeChange(setDraftSchedule, field, event);
    if (dialogError) setDialogError(null);
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      saveCustomSchedule();
    }
  }

  return (
    <div>
      <label htmlFor={fieldId} className="block text-xs font-medium text-[var(--muted)] mb-1">
        Plano de cuidado
      </label>
      <select
        id={fieldId}
        name={selectionName}
        value={selectedOption}
        onChange={handleSelectionChange}
        aria-describedby={helpId}
        className="input"
      >
        {CARE_PLAN_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {initialState.legacyValue !== null && (
          <option value={LEGACY_CARE_PLAN_OPTION}>Valor anterior: {initialState.legacyValue}</option>
        )}
      </select>
      <input type="hidden" name={name} value={storedValue} />

      {selectedOption === CUSTOM_CARE_PLAN_OPTION && customSchedule && savedCustomDuration !== null ? (
        <div id={helpId} className="schedule-summary">
          <p>
            Horário: <strong>{customSchedule.start}–{customSchedule.end}</strong>
          </p>
          <p>
            Total: <strong className="duration">{formatDuration(savedCustomDuration)}</strong>
          </p>
          <button type="button" onClick={(event) => openCustomScheduleDialog(event.currentTarget)} className="edit-schedule-button">
            Editar horário
          </button>
        </div>
      ) : selectedOption === LEGACY_CARE_PLAN_OPTION ? (
        <p id={helpId} className="field-help">
          Este valor anterior será mantido até que você escolha outro plano.
        </p>
      ) : (
        <p id={helpId} className="field-help">
          Ao escolher Personalizado, informe o intervalo diário de atendimento.
        </p>
      )}

      {dialogOpen && (
        <dialog
          ref={dialogRef}
          id={dialogId}
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          aria-describedby={dialogDescriptionId}
          className="care-plan-dialog"
          onCancel={(event) => {
            event.preventDefault();
            cancelCustomScheduleDialog();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) cancelCustomScheduleDialog();
          }}
          onKeyDown={handleDialogKeyDown}
        >
          <div className="dialog-content">
            <header className="dialog-header">
              <div>
                <h2 id={dialogTitleId}>Definir horário personalizado</h2>
                <p id={dialogDescriptionId}>
                  Informe as horas de início e fim. Se a hora de fim for menor, o período continuará após a meia-noite.
                </p>
              </div>
            </header>

            <div className="time-grid">
              <div>
                <label htmlFor={startId} className="dialog-label">Hora de início</label>
                <input
                  ref={startTimeRef}
                  id={startId}
                  type="time"
                  step="60"
                  value={draftSchedule.start}
                  onChange={(event) => handleTimeChange("start", event)}
                  required
                  aria-invalid={dialogError ? "true" : undefined}
                  aria-describedby={`${dialogDescriptionId} ${dialogError ? dialogErrorId : durationId}`}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor={endId} className="dialog-label">Hora de fim</label>
                <input
                  ref={endTimeRef}
                  id={endId}
                  type="time"
                  step="60"
                  value={draftSchedule.end}
                  onChange={(event) => handleTimeChange("end", event)}
                  required
                  aria-invalid={dialogError ? "true" : undefined}
                  aria-describedby={`${dialogDescriptionId} ${dialogError ? dialogErrorId : durationId}`}
                  className="input"
                />
              </div>
            </div>

            <p id={dialogErrorId} role="alert" className={dialogError ? "validation-error" : "validation-error empty"}>
              {dialogError || ""}
            </p>
            <p id={durationId} role="status" aria-live="polite" className="duration-summary">
              {draftDuration === null ? "Informe horários diferentes para calcular o total." : <>Total: <strong className="duration">{formatDuration(draftDuration)}</strong></>}
            </p>

            <div className="dialog-actions">
              <button type="button" onClick={cancelCustomScheduleDialog} className="secondary-action">
                Cancelar
              </button>
              <button type="button" onClick={saveCustomSchedule} className="primary-action">
                Salvar horário
              </button>
            </div>
          </div>
        </dialog>
      )}

      <style jsx>{`
        .input {
          width: 100%;
          min-height: 2.75rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: white;
          padding: 0.625rem 0.75rem;
          font-size: 1rem;
          line-height: 1.5;
          color: var(--foreground);
        }

        .input:focus {
          border-color: var(--brand);
          box-shadow: 0 0 0 3px var(--brand-light);
        }

        .field-help,
        .schedule-summary {
          margin-top: 0.4rem;
          color: var(--muted-2);
          font-size: 0.75rem;
          line-height: 1.5;
        }

        .schedule-summary {
          display: grid;
          gap: 0.15rem;
          color: var(--muted);
        }

        .schedule-summary p {
          margin: 0;
        }

        .duration {
          font-variant-numeric: tabular-nums;
        }

        .edit-schedule-button {
          justify-self: start;
          min-height: 2.5rem;
          margin-top: 0.25rem;
          padding: 0.25rem 0;
          color: var(--brand-dark);
          font-size: 0.75rem;
          font-weight: 600;
          text-decoration: underline;
          text-underline-position: from-font;
        }

        .care-plan-dialog {
          width: min(32rem, calc(100vw - 2rem));
          max-height: calc(100vh - 2rem);
          margin: auto;
          padding: 0;
          overflow: auto;
          overscroll-behavior: contain;
          border: 1px solid var(--border);
          border-radius: 1rem;
          background: var(--surface);
          color: var(--foreground);
          box-shadow: 0 1.5rem 4rem rgba(20, 63, 58, 0.2);
        }

        :global(.care-plan-dialog::backdrop) {
          background: rgba(9, 13, 12, 0.42);
        }

        .dialog-content {
          padding: 1.5rem;
        }

        .dialog-header h2 {
          margin: 0;
          color: var(--foreground);
          font-size: 1.1rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .dialog-header p {
          max-width: 34rem;
          margin: 0.5rem 0 0;
          color: var(--muted);
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .time-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 1.25rem;
        }

        .dialog-label {
          display: block;
          margin-bottom: 0.4rem;
          color: var(--foreground);
          font-size: 0.875rem;
          font-weight: 600;
        }

        .validation-error {
          min-height: 1.5rem;
          margin: 0.5rem 0 0;
          color: var(--status-critical);
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .validation-error.empty {
          visibility: hidden;
        }

        .duration-summary {
          margin: 0.75rem 0 0;
          padding: 0.75rem;
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          background: var(--brand-light);
          color: var(--brand-deep);
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .dialog-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        .secondary-action,
        .primary-action {
          min-height: 2.75rem;
          border-radius: 0.5rem;
          padding: 0.625rem 1rem;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .secondary-action {
          border: 1px solid var(--border);
          color: var(--foreground);
        }

        .secondary-action:hover {
          background: rgba(9, 13, 12, 0.03);
        }

        .primary-action {
          background: var(--brand);
          color: white;
        }

        .primary-action:hover {
          background: var(--brand-dark);
        }

        @media (max-width: 32rem) {
          .dialog-content {
            padding: 1.25rem;
          }

          .time-grid {
            grid-template-columns: 1fr;
          }

          .dialog-actions {
            flex-direction: column-reverse;
            align-items: stretch;
          }

          .secondary-action,
          .primary-action {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
