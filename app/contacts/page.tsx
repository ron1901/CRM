import Link from 'next/link';
import { db } from '@/lib/supabase/server';
import { ContactsTable } from '@/components/ContactsTable';
import { today } from '@/lib/form';
import type { Contact } from '@/lib/types';

export default async function ContactsPage() {
  const supabase = await db();
  const { data, error } = await supabase.from('contacts').select('*, referrer:referred_by(name)').order('name');
  if (error) throw new Error(error.message);
  const rows = (data ?? []).map((c) => ({ ...(c as Contact), referrer_name: (c.referrer as { name: string } | null)?.name ?? null }));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="h1 mb-0 mr-auto">Contacts</h1>
        <Link href="/data" className="btn-ghost">Import / Export CSV</Link>
        <Link href="/contacts/new" className="btn">+ Contact</Link>
      </div>
      <ContactsTable rows={rows} today={today()} />
    </div>
  );
}
