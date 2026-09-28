import type { ClusterStats } from '@/lib/types';
import { SCORE_CRITERIA } from '@/lib/options';

export function scoredCount(c: ClusterStats) {
  return SCORE_CRITERIA.filter((s) => c[s.key] != null).length;
}

export function EntryBarBadge({ c }: { c: ClusterStats }) {
  return c.passes_entry_bar ? (
    <span className="badge bg-green-600 text-white">✓ Entry bar</span>
  ) : (
    <span className="badge bg-slate-200 text-slate-600" title="Needs ≥5 interviewees, ≥2 companies, ≥1 Paid-for observation">
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
        <li key={text} className={ok ? 'text-green-700' : 'text-slate-500'}>{ok ? '✓' : '○'} {text}</li>
      ))}
    </ul>
  );
}
