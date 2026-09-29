import { ActionForm } from './ActionForm';
import { Field, Select } from './Fields';
import { LocalDateTimeInput } from './LocalDateTime';
import { saveContact } from '@/app/contacts/actions';
import { COMPANY_TYPES, HUNTING_GROUNDS, INTERVIEWERS, OWNERS, SENIORITY, SOURCES, STATUSES } from '@/lib/options';
import type { Contact } from '@/lib/types';

export function ContactForm({
  contact,
  others,
}: {
  contact?: Contact;
  others: { id: string; name: string; company: string | null }[];
}) {
  const c = contact;
  return (
    <ActionForm action={saveContact.bind(null, c?.id ?? null)} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Name *"><input name="name" className="input" required defaultValue={c?.name} /></Field>
        <Field label="Title"><input name="title" className="input" defaultValue={c?.title ?? ''} /></Field>
        <Field label="Function"><input name="function" className="input" defaultValue={c?.function ?? ''} /></Field>
        <Field label="Seniority"><Select name="seniority" options={SENIORITY} defaultValue={c?.seniority} /></Field>
        <Field label="Company"><input name="company" className="input" defaultValue={c?.company ?? ''} /></Field>
        <Field label="Company type"><Select name="company_type" options={COMPANY_TYPES} defaultValue={c?.company_type} /></Field>
        <Field label="Country"><input name="country" className="input" defaultValue={c?.country ?? ''} /></Field>
        <Field label="LinkedIn URL"><input name="linkedin_url" type="url" className="input" defaultValue={c?.linkedin_url ?? ''} /></Field>
        <Field label="Hunting ground"><Select name="hunting_ground" options={HUNTING_GROUNDS} defaultValue={c?.hunting_ground} /></Field>
        <Field label="Source"><Select name="source" options={SOURCES} defaultValue={c?.source} /></Field>
        <Field label="Referred by">
          <Select
            name="referred_by"
            options={others.filter((o) => o.id !== c?.id).map((o) => ({ value: o.id, label: o.name + (o.company ? ` (${o.company})` : '') }))}
            defaultValue={c?.referred_by}
          />
        </Field>
        <Field label="Owner"><Select name="owner" options={OWNERS} defaultValue={c?.owner} /></Field>
        <Field label="Status"><Select name="status" options={STATUSES} defaultValue={c?.status ?? 'Target'} blank={false} /></Field>
        <Field label="Interview booked for"><LocalDateTimeInput name="meeting_at" defaultValue={c?.meeting_at} /></Field>
        <Field label="Meeting with (us)"><Select name="meeting_with" options={INTERVIEWERS} defaultValue={c?.meeting_with} /></Field>
        <Field label="Meeting link"><input name="meeting_link" type="url" className="input" placeholder="Zoom / Teams / Meet" defaultValue={c?.meeting_link ?? ''} /></Field>
        <Field label="Last touch"><input name="last_touch_date" type="date" className="input" defaultValue={c?.last_touch_date ?? ''} /></Field>
        <Field label="Next action date"><input name="next_action_date" type="date" className="input" defaultValue={c?.next_action_date ?? ''} /></Field>
        <Field label="Next action" className="sm:col-span-2 lg:col-span-4"><input name="next_action" className="input" defaultValue={c?.next_action ?? ''} /></Field>
        <Field label="Notes" className="sm:col-span-2 lg:col-span-4"><textarea name="notes" rows={3} className="input" defaultValue={c?.notes ?? ''} /></Field>
      </div>
      <button className="btn">{c ? 'Save' : 'Add contact'}</button>
    </ActionForm>
  );
}
