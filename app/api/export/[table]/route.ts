import Papa from 'papaparse';
import { db } from '@/lib/supabase/server';
import { CONTACT_CSV_COLUMNS } from '@/lib/contactCsv';

type Row = Record<string, unknown>;
const IV_CONTACT = 'contact:contacts!interviews_contact_id_fkey(name,company,hunting_ground)';

export async function GET(req: Request, { params }: { params: Promise<{ table: string }> }) {
  const { table } = await params;
  const url = new URL(req.url);
  const supabase = await db();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  let fields: string[];
  let rows: Row[];

  if (table === 'contacts' || table === 'contacts-template') {
    fields = [...CONTACT_CSV_COLUMNS];
    if (table === 'contacts-template') rows = [];
    else {
      const { data, error } = await supabase.from('contacts').select('*, referrer:referred_by(name)').order('name');
      if (error) return new Response(error.message, { status: 500 });
      rows = data.map((c: Row) => ({ ...c, referred_by_name: (c.referrer as { name: string } | null)?.name ?? '' }));
    }
  } else if (table === 'interviews') {
    const withTranscripts = url.searchParams.get('transcripts') === '1';
    fields = ['id', 'date', 'contact_name', 'company', 'hunting_ground', 'interviewers', 'duration_min', 'workflow_discussed', 'notes',
      'magic_button_answer', 'consent_to_record', 'recording_url', 'logged_within_30_min', ...(withTranscripts ? ['transcript'] : [])];
    const { data, error } = await supabase.from('interviews').select(`*, ${IV_CONTACT}`).order('date');
    if (error) return new Response(error.message, { status: 500 });
    rows = data.map((i: Row) => {
      const c = i.contact as Row | null;
      return { ...i, contact_name: c?.name, company: c?.company, hunting_ground: c?.hunting_ground };
    });
  } else if (table === 'observations') {
    fields = ['id', 'interview_date', 'contact_name', 'company', 'hunting_ground', 'workflow_step', 'problem_statement', 'quote',
      'frequency_text', 'frequency_per_month', 'time_spent_hours', 'cost_estimate', 'current_solution', 'workaround',
      'evidence_type', 'severity', 'tags', 'cluster'];
    const { data, error } = await supabase.from('observations').select(`*, interview:interviews(date, ${IV_CONTACT}), cluster:clusters(name)`).order('created_at');
    if (error) return new Response(error.message, { status: 500 });
    rows = data.map((o: Row) => {
      const iv = o.interview as { date: string; contact: Row | null } | null;
      return {
        ...o,
        interview_date: iv?.date, contact_name: iv?.contact?.name, company: iv?.contact?.company, hunting_ground: iv?.contact?.hunting_ground,
        tags: (o.tags as string[]).join('; '), cluster: (o.cluster as { name: string } | null)?.name ?? '',
      };
    });
  } else if (table === 'clusters') {
    fields = ['id', 'name', 'status', 'weighted_score', 'passes_entry_bar', 'interviewee_count', 'company_count', 'observation_count',
      'has_paid_evidence', 'hunting_ground', 'owner_persona', 'description', 'competitors_alternatives', 'score_paid_pain',
      'score_independent', 'score_quantified_cost', 'score_ai_economics', 'score_owner_budget', 'score_narrow_wedge', 'score_reg_friction'];
    const { data, error } = await supabase.from('cluster_stats').select('*').order('weighted_score', { ascending: false });
    if (error) return new Response(error.message, { status: 500 });
    rows = data;
  } else {
    return new Response('Unknown table', { status: 404 });
  }

  // escapeFormulae stops cells like "=HYPERLINK(...)" executing when opened in Excel/Sheets.
  const csv = Papa.unparse({ fields, data: rows.map((r) => fields.map((f) => r[f] ?? '')) }, { escapeFormulae: true });
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${table}-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
