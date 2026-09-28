import { db } from '@/lib/supabase/server';
import { InterviewForm } from '@/components/InterviewForm';
import { saveInterview } from '../actions';
import { today } from '@/lib/form';

export default async function NewInterview({ searchParams }: { searchParams: Promise<{ contact?: string }> }) {
  const { contact } = await searchParams;
  const supabase = await db();
  const { data: contacts } = await supabase.from('contacts').select('id,name,company').order('name');
  return (
    <div className="card">
      <h1 className="h1">Log interview</h1>
      <p className="mb-4 text-slate-400">Step 1 of 2: the interview. Next you add observations on the same page.</p>
      <InterviewForm action={saveInterview.bind(null, null)} contacts={contacts ?? []} defaultContact={contact} today={today()} />
    </div>
  );
}
