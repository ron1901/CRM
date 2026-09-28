import Link from 'next/link';
import { db } from '@/lib/supabase/server';
import { Kanban } from '@/components/Kanban';
import { today } from '@/lib/form';
import type { Contact } from '@/lib/types';

export default async function PipelinePage() {
  const supabase = await db();
  const { data } = await supabase.from('contacts').select('*').order('next_action_date', { ascending: true, nullsFirst: false });
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h1 className="h1 mb-0 mr-auto">Pipeline</h1>
        <Link href="/contacts/new" className="btn">+ Contact</Link>
      </div>
      <Kanban contacts={(data ?? []) as Contact[]} today={today()} />
    </div>
  );
}
