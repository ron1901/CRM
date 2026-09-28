import Link from 'next/link';
import { db } from '@/lib/supabase/server';
import { GateCheckbox } from '@/components/GateCheckbox';
import { today as todayStr } from '@/lib/form';
import { COMPANY_TYPES, HUNTING_GROUNDS, SENIORITY } from '@/lib/options';

type Target = { metric: 'outreach_sent' | 'interviews_done'; due_date: string; target: number };
type Gate = { id: string; date: string; title: string; done: boolean };
type IvRow = { date: string; contact: { hunting_ground: string | null; seniority: string | null; company_type: string | null } | null };

const DAY = 86400000;
const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * DAY).toISOString().slice(0, 10);
const fmt = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

export default async function Dashboard() {
  const supabase = await db();
  const today = todayStr();
  const [contactsRes, interviewsRes, clustersRes, targetsRes, gatesRes] = await Promise.all([
    supabase.from('contacts').select('first_contacted_on,meeting_at,status,referred_in_interview'),
    supabase.from('interviews').select('date,contact:contacts!interviews_contact_id_fkey(hunting_ground,seniority,company_type)'),
    supabase.from('cluster_stats').select('interviewee_count,passes_entry_bar,status'),
    supabase.from('kpi_targets').select('*').order('due_date'),
    supabase.from('gates').select('*').order('date'),
  ]);
  for (const r of [contactsRes, interviewsRes, clustersRes, targetsRes, gatesRes]) if (r.error) throw new Error(r.error.message);
  const contacts = contactsRes.data!;
  const interviews = interviewsRes.data as unknown as IvRow[];
  const clusters = clustersRes.data!.filter((c) => c.status !== 'Dropped');
  const targets = targetsRes.data as Target[];
  const gates = gatesRes.data as Gate[];

  const outreachBy = (d: string) => contacts.filter((c) => c.first_contacted_on && c.first_contacted_on <= d).length;
  const interviewsBy = (d: string) => interviews.filter((i) => i.date <= d).length;

  // "Next week" = the next Monday–Sunday.
  const dow = (new Date(today + 'T00:00:00Z').getUTCDay() + 6) % 7; // Mon=0
  const nextMon = addDays(today, 7 - dow);
  const nextSun = addDays(nextMon, 6);
  const bookedNextWeek = contacts.filter((c) => {
    if (!c.meeting_at || c.status === 'Declined' || c.status === 'No response') return false;
    const d = c.meeting_at.slice(0, 10);
    return d >= nextMon && d <= nextSun;
  }).length;
  const referrals = contacts.filter((c) => c.referred_in_interview).length;
  const refPerInterview = interviews.length ? referrals / interviews.length : 0;

  const kpi = (metric: Target['metric'], actualBy: (d: string) => number) => {
    const rows = targets.filter((t) => t.metric === metric);
    const next = rows.find((t) => t.due_date >= today) ?? rows[rows.length - 1];
    return { rows, next, actual: actualBy(today), actualBy };
  };
  const outreach = kpi('outreach_sent', outreachBy);
  const done = kpi('interviews_done', interviewsBy);

  const nextGate = gates.find((g) => !g.done && g.date >= today);

  return (
    <div className="space-y-6">
      <h1 className="h1">Dashboard <span className="text-sm font-normal text-slate-400">today {fmt(today)}</span></h1>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiTile label="Outreach sent" {...outreach} today={today} />
        <KpiTile label="Interviews done" {...done} today={today} />
        <SimpleTile
          label={`Booked for next week (${fmt(nextMon)}–${fmt(nextSun)})`}
          value={bookedNextWeek}
          target={12}
          met={bookedNextWeek >= 12}
          note="Contacts with an interview slot set next week"
        />
        <SimpleTile
          label="Referrals per interview"
          value={refPerInterview.toFixed(2)}
          target={1}
          met={refPerInterview >= 1}
          note={`${referrals} referrals from ${interviews.length} interviews`}
        />
        <SimpleTile label="Clusters with ≥3 interviewees" value={clusters.filter((c) => c.interviewee_count >= 3).length} note={`of ${clusters.length} active clusters`} />
        <SimpleTile label="Clusters passing entry bar" value={clusters.filter((c) => c.passes_entry_bar).length} note="≥5 interviewees, ≥2 companies, ≥1 Paid-for" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-x-auto">
          <h2 className="h2">Weekly targets (cumulative)</h2>
          <table className="tbl">
            <thead>
              <tr><th>By</th><th>Outreach</th><th>Interviews</th></tr>
            </thead>
            <tbody>
              {outreach.rows.map((t) => {
                const it = done.rows.find((r) => r.due_date === t.due_date);
                const future = t.due_date > today;
                return (
                  <tr key={t.due_date} className={t.due_date === outreach.next?.due_date ? 'bg-cyan-400/10' : ''}>
                    <td>{fmt(t.due_date)}</td>
                    <td><Vs actual={future ? outreach.actual : outreachBy(t.due_date)} target={t.target} future={future} /></td>
                    <td>{it && <Vs actual={future ? done.actual : interviewsBy(t.due_date)} target={it.target} future={future} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-400">Past rows show where you were on that date; future rows show today’s count. Outreach = contacts that left “Target”.</p>
        </div>

        <div className="card">
          <h2 className="h2">Decision gates</h2>
          <ul className="space-y-1.5">
            {gates.map((g) => {
              const days = daysBetween(today, g.date);
              const isNext = g.id === nextGate?.id;
              return (
                <li key={g.id} className={`flex items-center gap-2 rounded px-2 py-1 ${isNext ? 'bg-cyan-400/10 font-medium' : ''} ${g.done ? 'text-slate-500 line-through' : ''}`}>
                  <GateCheckbox id={g.id} done={g.done} />
                  <span className="w-14">{fmt(g.date)}</span>
                  <span className="flex-1">{g.title}</span>
                  {!g.done && <span className={`text-xs ${days < 0 ? 'text-rose-400' : 'text-slate-400'}`}>{days < 0 ? `${-days}d overdue` : days === 0 ? 'today' : `in ${days}d`}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="h2">Interviews by segment ({interviews.length})</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Breakdown title="Hunting ground" keys={HUNTING_GROUNDS} values={interviews.map((i) => i.contact?.hunting_ground)} />
          <Breakdown title="Seniority" keys={SENIORITY} values={interviews.map((i) => i.contact?.seniority)} />
          <Breakdown title="Company type" keys={COMPANY_TYPES} values={interviews.map((i) => i.contact?.company_type)} />
        </div>
      </section>
      <p className="text-xs text-slate-400">Go to <Link className="link" href="/pipeline">Pipeline</Link> for overdue next actions.</p>
    </div>
  );
}

function Progress({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, max ? (value / max) * 100 : 0);
  return (
    <div className="mt-2 h-2 w-full rounded-full bg-white/10" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Status({ met }: { met: boolean }) {
  return met ? <span className="text-xs font-medium text-emerald-300">✓ Met</span> : <span className="text-xs font-medium text-amber-300">▲ Behind</span>;
}

function KpiTile({ label, next, actual, today }: { label: string; next?: Target; actual: number; today: string }) {
  if (!next) return <SimpleTile label={label} value={actual} note="No targets seeded" />;
  const days = daysBetween(today, next.due_date);
  return (
    <div className="card">
      <div className="flex justify-between text-slate-300"><span>{label}</span><Status met={actual >= next.target} /></div>
      <div className="mt-1 text-3xl font-bold"><span className="num">{actual}</span><span className="text-base font-normal text-slate-500"> / {next.target}</span></div>
      <Progress value={actual} max={next.target} />
      <div className="mt-1 text-xs text-slate-400">
        target by {fmt(next.due_date)} {days >= 0 ? `(${days}d left, ${Math.max(0, next.target - actual)} to go)` : '(last target date passed)'}
      </div>
    </div>
  );
}

function SimpleTile({ label, value, target, met, note }: { label: string; value: number | string; target?: number; met?: boolean; note?: string }) {
  return (
    <div className="card">
      <div className="flex justify-between text-slate-300"><span>{label}</span>{met !== undefined && <Status met={met} />}</div>
      <div className="mt-1 text-3xl font-bold">
        <span className="num">{value}</span>
        {target !== undefined && <span className="text-base font-normal text-slate-500"> / target {target}{typeof value === 'number' ? '+' : ''}</span>}
      </div>
      {typeof value === 'number' && target !== undefined && <Progress value={value} max={target} />}
      {note && <div className="mt-1 text-xs text-slate-400">{note}</div>}
    </div>
  );
}

function Vs({ actual, target, future }: { actual: number; target: number; future: boolean }) {
  const met = actual >= target;
  return (
    <span>
      <span className="font-medium">{actual}</span> / {target}{' '}
      {met ? <span className="text-emerald-300">✓</span> : !future ? <span className="text-amber-300">▲ missed</span> : null}
    </span>
  );
}

function Breakdown({ title, keys, values }: { title: string; keys: readonly string[]; values: (string | null | undefined)[] }) {
  const counts = new Map<string, number>(keys.map((k) => [k, 0]));
  let unset = 0;
  for (const v of values) {
    if (v && counts.has(v)) counts.set(v, counts.get(v)! + 1);
    else unset++;
  }
  const rows = [...counts.entries()];
  if (unset) rows.push(['(not set)', unset]);
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <div className="card">
      <h3 className="mb-2 font-medium">{title}</h3>
      <table className="w-full">
        <tbody>
          {rows.map(([k, n]) => (
            <tr key={k} title={`${k}: ${n} interview(s)`}>
              <td className="w-36 py-0.5 pr-2 text-slate-300">{k}</td>
              <td className="py-0.5">
                <div className="flex items-center gap-2">
                  <div className="h-3 rounded-r bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]" style={{ width: `${(n / max) * 100}%`, minWidth: n ? 4 : 0 }} />
                  <span className="text-xs text-slate-200">{n}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
