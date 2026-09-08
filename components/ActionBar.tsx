"use client";

import { useState } from "react";

export interface ActionDefinition {
  key: string;
  label: string;
  tone?: "primary" | "danger" | "warning";
  /** When false the button is disabled and `disabledReason` is shown as a tooltip. */
  enabled: boolean;
  disabledReason?: string;
  /** Optional extra input, e.g. picking a new owner when reassigning. */
  extraField?: { label: string; options: { value: string; label: string }[] };
}

interface ActionBarProps {
  actions: ActionDefinition[];
  /** Runs the business action; a reason is always collected and always required. */
  onSubmit: (actionKey: string, input: { reason: string; extraValue?: string }) => Promise<void>;
}

/**
 * Shared "business action with mandatory reason" pattern. Every workflow gets
 * the same confirm dialog, validation and error surface, and every action it
 * runs is expected to be audited server-side.
 */
export function ActionBar({ actions, onSubmit }: ActionBarProps) {
  const [pending, setPending] = useState<ActionDefinition | null>(null);
  const [reason, setReason] = useState("");
  const [extraValue, setExtraValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function open(action: ActionDefinition) {
    setPending(action);
    setReason("");
    setExtraValue(action.extraField?.options[0]?.value ?? "");
    setError(null);
  }

  async function submit() {
    if (!pending) return;
    if (reason.trim().length < 5) {
      setError("A reason of at least 5 characters is required.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(pending.key, { reason: reason.trim(), extraValue: extraValue || undefined });
      setPending(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="actionBar">
        {actions.map((action) => (
          <button
            key={action.key}
            className={`button button-${action.tone ?? "primary"}`}
            disabled={!action.enabled}
            title={!action.enabled ? action.disabledReason : undefined}
            onClick={() => open(action)}
          >
            {action.label}
          </button>
        ))}
      </div>

      {pending && (
        <div className="modalOverlay" role="dialog" aria-modal="true" aria-label={pending.label}>
          <div className="modal">
            <h3>{pending.label}</h3>
            {pending.extraField && (
              <label className="modalField">
                <span>{pending.extraField.label}</span>
                <select
                  className="input"
                  value={extraValue}
                  aria-label={pending.extraField.label}
                  onChange={(e) => setExtraValue(e.target.value)}
                >
                  {pending.extraField.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="modalField">
              <span>Reason (required)</span>
              <textarea
                className="input"
                rows={4}
                value={reason}
                aria-label="Reason"
                placeholder="Recorded in the audit trail"
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            {error && <p className="errorText">{error}</p>}
            <div className="modalActions">
              <button className="button button-ghost" onClick={() => setPending(null)} disabled={submitting}>
                Cancel
              </button>
              <button className="button button-primary" onClick={submit} disabled={submitting}>
                {submitting ? "Saving…" : `Confirm ${pending.label}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
