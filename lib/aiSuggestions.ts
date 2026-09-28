import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { suggestObservations, type Suggestion } from './suggest';

// Stored on interviews.ai_suggestions until a human approves or dismisses each item.
export type PendingSuggestion = Omit<Suggestion, 'cluster_name'> & { id: string; cluster_id: string | null };
export type AiSuggestions =
  | { status: 'running'; started_at: string }
  | { status: 'done'; items: PendingSuggestion[] }
  | { status: 'error'; error: string };

export async function runSuggestions(supabase: SupabaseClient, interviewId: string) {
  const { data: iv } = await supabase
    .from('interviews')
    .select('transcript,notes,workflow_discussed,magic_button_answer,contact:contacts!interviews_contact_id_fkey(name,title,company)')
    .eq('id', interviewId)
    .single();
  if (!iv) return;
  const [{ data: obs }, { data: clusters }] = await Promise.all([
    supabase.from('observations').select('problem_statement').eq('interview_id', interviewId),
    supabase.from('clusters').select('id,name,description').neq('status', 'Dropped'),
  ]);
  const c = iv.contact as unknown as { name: string; title: string | null; company: string | null } | null;
  const result = await suggestObservations({
    transcript: iv.transcript,
    notes: iv.notes,
    workflow: iv.workflow_discussed,
    magicButton: iv.magic_button_answer,
    interviewee: [c?.name, c?.title, c?.company].filter(Boolean).join(', '),
    alreadyLogged: (obs ?? []).map((o) => o.problem_statement),
    clusters: (clusters ?? []).map((x) => ({ name: x.name, description: x.description })),
  });
  const byName = new Map((clusters ?? []).map((x) => [x.name.toLowerCase().trim(), x.id]));
  const value: AiSuggestions = result.error
    ? { status: 'error', error: result.error }
    : {
        status: 'done',
        items: result.suggestions!.map(({ cluster_name, ...o }) => ({
          ...o,
          id: crypto.randomUUID(),
          cluster_id: cluster_name ? byName.get(cluster_name.toLowerCase().trim()) ?? null : null,
        })),
      };
  const { error } = await supabase.from('interviews').update({ ai_suggestions: value }).eq('id', interviewId);
  if (error) console.error('ai_suggestions update failed', error.message);
}
