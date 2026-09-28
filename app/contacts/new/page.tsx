import { db } from '@/lib/supabase/server';
import { ContactForm } from '@/components/ContactForm';

export default async function NewContact() {
  const supabase = await db();
  const { data: others } = await supabase.from('contacts').select('id,name,company').order('name');
  return (
    <div className="card">
      <h1 className="h1">New contact</h1>
      <ContactForm others={others ?? []} />
    </div>
  );
}
