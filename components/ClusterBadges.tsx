import type { ClusterStats } from '@/lib/types';
import { SCORE_CRITERIA } from '@/lib/options';

export function scoredCount(c: ClusterStats) {
  return SCORE_CRITERIA.filter((s) => c[s.key] != null).length;
}

export function EntryBarBadge({ c }: { c: ClusterStats }) {
  return c.passes_entry_bar ? (
    <span className="badge bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 shadow-[0_0_14px_rgba(52,211,153,0.7)]">✓ Entry bar</span>
  ) : (
    <span className="badge bg-white/10 text-slate-300" title="Needs ≥5 interviewees, ≥2 companies, ≥1 Paid-for observation">
      Below bar
    </span>
  );
}

export function EntryBarChecklist({ c }: { c: ClusterStats }) {
  const items = [
    [c.interviewee_count >= 5, `${c.interviewee_count}/5 distinct interviewees`],
    [c.company_count >= 2, `${c.company_count}/2 distinct companies`],
    [c.has_paid_evidence, c.has_paid_evidence ? 'Has Paid-for evidence' : 'No Paid-for evidence yet'],
  ] as const;
  return (
    <ul className="space-y-0.5">
      {items.map(([ok, text]) => (
        <li key={text} className={ok ? 'text-emerald-300' : 'text-slate-400'}>{ok ? '✓' : '○'} {text}</li>
      ))}
    </ul>
  );
}
