import Link from 'next/link';
import { db } from '@/lib/supabase/server';

type Row = {
  id: string;
  date: string;
  interviewers: string;
  workflow_discussed: string | null;
  logged_within_30_min: boolean;
  consent_to_record: boolean;
  contact: { id: string; name: string; company: string | null; hunting_ground: string | null } | null;
  observations: { count: number }[];
};

export default async function InterviewsPage() {
  const supabase = await db();
  const { data, error } = await supabase
    .from('interviews')
    .select('id,date,interviewers,workflow_discussed,logged_within_30_min,consent_to_record,contact:contacts!interviews_contact_id_fkey(id,name,company,hunting_ground),observations(count)')
    .order('date', { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h1 className="h1 mb-0 mr-auto">Interviews ({rows.length})</h1>
        <Link href="/interviews/new" className="btn">+ Log interview</Link>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="tbl">
          <thead>
            <tr><th>Date</th><th>Contact</th><th>Company</th><th>Hunting ground</th><th>By</th><th>Workflow</th><th>Obs</th><th>≤30 min</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td><Link className="link" href={`/interviews/${r.id}`}>{r.date}</Link></td>
                <td>{r.contact?.name}</td>
                <td>{r.contact?.company}</td>
                <td>{r.contact?.hunting_ground}</td>
                <td>{r.interviewers}</td>
                <td>{r.workflow_discussed}</td>
                <td>{r.observations[0]?.count ?? 0}</td>
                <td>{r.logged_within_30_min ? '✓' : ''}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="text-slate-500">No interviews yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
