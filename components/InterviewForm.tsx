'use client';
import { useState } from 'react';
import { ActionForm } from './ActionForm';
import { Field, Select } from './Fields';
import { INTERVIEWERS } from '@/lib/options';
import type { ActionResult, Interview } from '@/lib/types';

export function InterviewForm({
  action,
  interview,
  contacts,
  defaultContact,
  today,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  interview?: Interview;
  contacts?: { id: string; name: string; company: string | null }[];
  defaultContact?: string;
  today: string;
}) {
  const i = interview;
  const [consent, setConsent] = useState(i?.consent_to_record ?? false);
  const hadRecordingData = !!(i?.transcript || i?.recording_url);
  return (
    <ActionForm action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {contacts && (
          <Field label="Contact *" className="lg:col-span-2">
            <Select
              name="contact_id"
              required
              defaultValue={defaultContact}
              options={contacts.map((c) => ({ value: c.id, label: c.name + (c.company ? ` (${c.company})` : '') }))}
            />
          </Field>
        )}
        <Field label="Date *"><input type="date" name="date" className="input" required defaultValue={i?.date ?? today} /></Field>
        <Field label="Interviewers *"><Select name="interviewers" options={INTERVIEWERS} required defaultValue={i?.interviewers} /></Field>
        <Field label="Duration (min)"><input type="number" min={0} name="duration_min" className="input" defaultValue={i?.duration_min ?? ''} /></Field>
        <Field label="Workflow discussed" className="sm:col-span-2 lg:col-span-3">
          <input name="workflow_discussed" className="input" defaultValue={i?.workflow_discussed ?? ''} placeholder="e.g. eCTD module 3 updates for variations" />
        </Field>
      </div>
      <Field label="Notes (markdown)"><textarea name="notes" rows={6} className="input font-mono" defaultValue={i?.notes ?? ''} /></Field>
      <Field label="Magic button answer"><input name="magic_button_answer" className="input" defaultValue={i?.magic_button_answer ?? ''} /></Field>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="consent_to_record" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          Consent to record given
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="logged_within_30_min" defaultChecked={i?.logged_within_30_min ?? false} />
          Logged within 30 min of the call
        </label>
      </div>
      {!consent && hadRecordingData && (
        <p className="rounded bg-amber-400/10 p-2 text-amber-200">Saving without consent will permanently erase the stored transcript and recording link.</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Fathom recording URL">
          <input type="url" name="recording_url" className="input" disabled={!consent} defaultValue={i?.recording_url ?? ''} placeholder={consent ? '' : 'Requires consent'} />
        </Field>
      </div>
      <Field label="Transcript (paste from Fathom)">
        <textarea name="transcript" rows={consent ? 6 : 2} className="input font-mono text-xs" disabled={!consent} defaultValue={i?.transcript ?? ''} placeholder={consent ? '' : 'Tick consent to record to enable'} />
      </Field>
      <button className="btn">{i ? 'Save interview' : 'Save & add observations →'}</button>
    </ActionForm>
  );
}
