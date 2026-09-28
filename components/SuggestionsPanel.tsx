import { ObservationForm } from './ObservationForm';
import { DeleteButton } from './DeleteButton';
import { Poll } from './Poll';
import { approveAllSuggestions, approveSuggestion, dismissSuggestion, rerunSuggestions } from '@/app/interviews/actions';
import type { AiSuggestions } from '@/lib/aiSuggestions';

const STUCK_MS = 5 * 60 * 1000;

export function SuggestionsPanel({
  interviewId,
  state,
  hasSource,
  clusters,
}: {
  interviewId: string;
  state: AiSuggestions | null;
  hasSource: boolean;
  clusters: { id: string; name: string }[];
}) {
  const stuck = state?.status === 'running' && Date.now() - Date.parse(state.started_at) > STUCK_MS;
  const rerun = (label: string) => (
    <DeleteButton action={rerunSuggestions.bind(null, interviewId)} confirmText="" label={label} className="btn-ghost" />
  );

  if (state?.status === 'running' && !stuck) {
    return (
      <div className="card flex items-center gap-3 border-cyan-400/30">
        <Poll />
        <span className="h-3 w-3 animate-ping rounded-full bg-cyan-400" />
        <span>✨ AI is reading the interview and drafting observations… (usually under a minute, you can leave this page)</span>
      </div>
    );
  }
  if (stuck || state?.status === 'error') {
    return (
      <div className="card flex flex-wrap items-center gap-3 border-rose-400/30">
        <span className="text-rose-300">✨ {stuck ? 'The AI run did not finish.' : state?.status === 'error' ? state.error : ''}</span>
        {rerun('Try again')}
      </div>
    );
  }
  if (state?.status === 'done' && state.items.length > 0) {
    return (
      <div className="card space-y-3 border-fuchsia-400/30 shadow-[0_0_40px_-15px_rgba(217,70,239,0.6)]">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="h2 mb-0 mr-auto">✨ AI-suggested observations ({state.items.length}) — review before saving</h2>
          <DeleteButton
            action={approveAllSuggestions.bind(null, interviewId)}
            confirmText=""
            label="✓ Approve all"
            className="btn"
          />
          <DeleteButton action={dismissSuggestion.bind(null, interviewId, null)} confirmText="Discard all suggestions?" label="Discard all" className="btn-ghost" />
        </div>
        <p className="text-xs text-slate-400">Nothing is saved until you approve it. Edit any field first if needed. Quotes should be verbatim — check them against the transcript.</p>
        {state.items.map((s) => (
          <details key={s.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <summary className="cursor-pointer">
              <span className="badge mr-2 bg-white/10">{s.evidence_type}</span>
              {s.severity && <span className="badge mr-2 bg-amber-400/15 text-amber-200">sev {s.severity}</span>}
              {s.problem_statement}
              {s.cluster_id && <span className="ml-2 text-xs text-cyan-300">→ {clusters.find((c) => c.id === s.cluster_id)?.name}</span>}
              {s.quote && <div className="mt-1 pl-5 text-xs italic text-slate-400">“{s.quote}”</div>}
            </summary>
            <div className="mt-3">
              <ObservationForm
                interviewId={interviewId}
                observation={s}
                clusters={clusters}
                action={approveSuggestion.bind(null, interviewId, s.id)}
                submitLabel="✓ Approve"
                extraButtons={
                  <DeleteButton action={dismissSuggestion.bind(null, interviewId, s.id)} confirmText="Dismiss this suggestion?" label="Dismiss" className="btn-ghost" />
                }
              />
            </div>
          </details>
        ))}
      </div>
    );
  }
  if (!hasSource) return null;
  return <div className="flex justify-end">{rerun('✨ Suggest observations with AI')}</div>;
}
