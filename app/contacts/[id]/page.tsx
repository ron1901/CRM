import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/supabase/server';
import { ContactForm } from '@/components/ContactForm';
import { DeleteButton } from '@/components/DeleteButton';
import { deleteContact } from '../actions';
import type { Contact } from '@/lib/types';

export default async function ContactPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const { created } = await searchParams;
  const supabase = await db();
  const [{ data: contact }, { data: others }, { data: interviews }, { data: referrals }] = await Promise.all([
    supabase.from('contacts').select('*').eq('id', id).maybeSingle<Contact>(),
    supabase.from('contacts').select('id,name,company').order('name'),
    supabase.from('interviews').select('id,date,workflow_discussed,transcript,recording_url,observations(count)').eq('contact_id', id).order('date', { ascending: false }),
    supabase.from('contacts').select('id,name,company,status').eq('referred_by', id).order('name'),
  ]);
  if (!contact) notFound();

  const ivs = (interviews ?? []) as unknown as { id: string; date: string; workflow_discussed: string | null; transcript: string | null; recording_url: string | null; observations: { count: number }[] }[];
  const obsCount = ivs.reduce((s, i) => s + (i.observations[0]?.count ?? 0), 0);
  const transcripts = ivs.filter((i) => i.transcript).length;
  const recordings = ivs.filter((i) => i.recording_url).length;
  const confirmText =
    `Permanently delete ${contact.name}?\n\nThis also deletes:\n` +
    `• ${ivs.length} interview(s) incl. notes\n• ${transcripts} transcript(s)\n• ${recordings} recording link(s)\n• ${obsCount} observation(s)\n\n` +
    `${(referrals ?? []).length} contact(s) they referred are kept, with the "referred by" link removed.\n\nThis cannot be undone. ` +
    `Remember to also delete the recording in Fathom.`;

  return (
    <div className="space-y-4">
      {created && <p className="rounded bg-emerald-400/10 p-2 text-emerald-300">Contact added.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="h1 mb-0 mr-auto">{contact.name}</h1>
        <Link href={`/interviews/new?contact=${contact.id}`} className="btn">Log interview</Link>
        <DeleteButton action={deleteContact.bind(null, contact.id)} confirmText={confirmText} label="Delete contact + all data" />
      </div>
      <div className="card"><ContactForm contact={contact} others={others ?? []} /></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="h2">Interviews</h2>
          {ivs.length === 0 && <p className="text-slate-400">None yet.</p>}
          <ul className="space-y-1">
            {ivs.map((i) => (
              <li key={i.id}>
                <Link className="link" href={`/interviews/${i.id}`}>{i.date}</Link> — {i.workflow_discussed ?? 'no workflow noted'} ({i.observations[0]?.count ?? 0} obs)
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 className="h2">People they referred</h2>
          {(referrals ?? []).length === 0 && <p className="text-slate-400">None yet.</p>}
          <ul className="space-y-1">
            {(referrals ?? []).map((r) => (
              <li key={r.id}><Link className="link" href={`/contacts/${r.id}`}>{r.name}</Link> {r.company && `(${r.company})`} — {r.status}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
