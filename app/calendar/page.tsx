import { db } from '@/lib/supabase/server';
import { CalendarView, type CalMeeting } from '@/components/CalendarView';
import { ActionForm } from '@/components/ActionForm';
import { Field, Select } from '@/components/Fields';
import { LocalDateTimeInput } from '@/components/LocalDateTime';
import { scheduleMeeting } from './actions';
import { INTERVIEWERS } from '@/lib/options';

export default async function CalendarPage() {
  const supabase = await db();
  const [meetingsRes, gatesRes, contactsRes, interviewsRes] = await Promise.all([
    supabase
      .from('contacts')
      .select('id,name,title,company,owner,status,meeting_at,meeting_with,meeting_link')
      .not('meeting_at', 'is', null)
      .order('meeting_at'),
    supabase.from('gates').select('id,date,title,done').order('date'),
    supabase.from('contacts').select('id,name,company,status').not('status', 'in', '("Declined","No response")').order('name'),
    supabase.from('interviews').select('contact_id,date'),
  ]);
  for (const r of [meetingsRes, gatesRes, contactsRes, interviewsRes]) if (r.error) throw new Error(r.error.message);
  const logged = new Set(interviewsRes.data!.map((i) => i.contact_id));
  const meetings: CalMeeting[] = meetingsRes.data!.map((m) => ({ ...m, meeting_at: m.meeting_at!, logged: logged.has(m.id) }));

  return (
    <div className="space-y-4">
      <h1 className="h1">Calendar</h1>
      <details className="card">
        <summary className="cursor-pointer font-semibold">+ Book a meeting</summary>
        <ActionForm action={scheduleMeeting} resetOnSuccess className="mt-3 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Contact *" className="lg:col-span-2">
            <Select
              name="contact_id"
              required
              options={contactsRes.data!.map((c) => ({ value: c.id, label: `${c.name}${c.company ? ` (${c.company})` : ''} · ${c.status}` }))}
            />
          </Field>
          <Field label="When (your local time) *"><LocalDateTimeInput name="meeting_at" /></Field>
          <Field label="Who from us"><Select name="meeting_with" options={INTERVIEWERS} /></Field>
          <Field label="Meeting link"><input name="meeting_link" type="url" className="input" placeholder="Zoom / Teams / Meet" /></Field>
          <button className="btn justify-center lg:col-start-5">Book</button>
        </ActionForm>
        <p className="mt-2 text-xs text-slate-400">Booking moves the contact to “Scheduled”. Each contact has one upcoming slot; booking again replaces it.</p>
      </details>
      <CalendarView meetings={meetings} gates={gatesRes.data!} />
    </div>
  );
}
