import { ActionForm } from './ActionForm';
import { Field, Select } from './Fields';
import { saveObservation } from '@/app/interviews/actions';
import { EVIDENCE_TYPES } from '@/lib/options';
import type { ReactNode } from 'react';
import type { ActionResult, Observation } from '@/lib/types';

export function ObservationForm({
  interviewId,
  observation,
  clusters,
  action,
  submitLabel,
  extraButtons,
}: {
  interviewId: string;
  observation?: Partial<Observation>;
  clusters: { id: string; name: string }[];
  /** Override the default save (used to approve an AI suggestion). */
  action?: (fd: FormData) => Promise<ActionResult>;
  submitLabel?: string;
  extraButtons?: ReactNode;
}) {
  const o = observation;
  const editing = !!o?.id;
  return (
    <ActionForm action={action ?? saveObservation.bind(null, interviewId, o?.id ?? null)} resetOnSuccess={!o} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Problem statement *"><textarea name="problem_statement" rows={2} className="input" required defaultValue={o?.problem_statement} /></Field>
        <Field label="Quote (verbatim)"><textarea name="quote" rows={2} className="input" defaultValue={o?.quote ?? ''} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="Evidence"><Select name="evidence_type" options={EVIDENCE_TYPES} blank={false} defaultValue={o?.evidence_type ?? 'Stated'} /></Field>
        <Field label="Severity 1–5"><Select name="severity" options={['1', '2', '3', '4', '5']} defaultValue={o?.severity} /></Field>
        <Field label="Workflow step"><input name="workflow_step" className="input" defaultValue={o?.workflow_step ?? ''} /></Field>
        <Field label="Frequency (as said)"><input name="frequency_text" className="input" placeholder="every batch release" defaultValue={o?.frequency_text ?? ''} /></Field>
        <Field label="Times / month"><input name="frequency_per_month" type="number" step="any" min={0} className="input" defaultValue={o?.frequency_per_month ?? ''} /></Field>
        <Field label="Hours each time"><input name="time_spent_hours" type="number" step="any" min={0} className="input" defaultValue={o?.time_spent_hours ?? ''} /></Field>
        <Field label="Cost estimate"><input name="cost_estimate" className="input" placeholder="€40k/yr contractor" defaultValue={o?.cost_estimate ?? ''} /></Field>
        <Field label="Current solution"><input name="current_solution" className="input" defaultValue={o?.current_solution ?? ''} /></Field>
        <Field label="Workaround"><input name="workaround" className="input" defaultValue={o?.workaround ?? ''} /></Field>
        <Field label="Tags (comma-sep)"><input name="tags" className="input" defaultValue={o?.tags?.join(', ') ?? ''} /></Field>
        <Field label="Cluster" className="sm:col-span-2">
          <Select name="cluster_id" options={clusters.map((c) => ({ value: c.id, label: c.name }))} defaultValue={o?.cluster_id} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn">{submitLabel ?? (editing ? 'Save observation' : '+ Add observation')}</button>
        {extraButtons}
      </div>
    </ActionForm>
  );
}
