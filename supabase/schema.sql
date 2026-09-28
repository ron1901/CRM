-- Discovery CRM schema. Run once in Supabase → SQL Editor, then run seed.sql.
-- Safe to read top to bottom: tables, computed view, triggers, security.

-- ───────────────────────── Team allowlist ─────────────────────────
-- Only these emails can read/write anything, even if someone manages to sign up.
create table allowed_users (
  email text primary key
);

create or replace function is_team() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from allowed_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ───────────────────────── Contacts ─────────────────────────
create table contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text,
  function text,
  seniority text check (seniority in ('IC','Manager','Director','VP+')),
  company text,
  company_type text check (company_type in ('Big Pharma','Mid-size','Biotech','CRO','Med-comms','Reg consultancy','Vendor','Other')),
  country text,
  linkedin_url text,
  hunting_ground text check (hunting_ground in ('Regulatory','Quality-GxP','PV-Medical Affairs','Other')),
  source text check (source in ('Warm intro','Zell network','Snowball referral','Cold LinkedIn','Community','Expert network')),
  referred_by uuid references contacts(id) on delete set null,
  referred_in_interview uuid, -- FK added below, after interviews exists
  owner text check (owner in ('Ron','Ronica')),
  status text not null default 'Target' check (status in ('Target','Contacted','Replied','Scheduled','Interviewed','Follow-up','Declined','No response')),
  first_contacted_on date,   -- set automatically when status first leaves Target (drives "outreach sent")
  meeting_at timestamptz,    -- booked interview slot (drives "booked for next week")
  last_touch_date date,
  next_action text,
  next_action_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Interviews ─────────────────────────
create table interviews (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  date date not null default current_date,
  interviewers text not null check (interviewers in ('Ron','Ronica','Both')),
  duration_min int check (duration_min >= 0),
  workflow_discussed text,
  notes text,
  transcript text,
  recording_url text,
  consent_to_record boolean not null default false,
  magic_button_answer text,
  logged_within_30_min boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transcript_needs_consent check (transcript is null or consent_to_record),
  constraint recording_needs_consent check (recording_url is null or consent_to_record)
);

alter table contacts
  add constraint contacts_referred_in_interview_fkey
  foreign key (referred_in_interview) references interviews(id) on delete set null;

-- ───────────────────────── Clusters ─────────────────────────
create table clusters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  hunting_ground text check (hunting_ground in ('Regulatory','Quality-GxP','PV-Medical Affairs','Other')),
  owner_persona text,
  competitors_alternatives text,
  score_paid_pain int check (score_paid_pain between 1 and 5),
  score_independent int check (score_independent between 1 and 5),
  score_quantified_cost int check (score_quantified_cost between 1 and 5),
  score_ai_economics int check (score_ai_economics between 1 and 5),
  score_owner_budget int check (score_owner_budget between 1 and 5),
  score_narrow_wedge int check (score_narrow_wedge between 1 and 5),
  score_reg_friction int check (score_reg_friction between 1 and 5), -- high friction = bad, reverse-scored
  weighted_score numeric generated always as (round(
      0.25 * coalesce(score_paid_pain, 0)
    + 0.20 * coalesce(score_independent, 0)
    + 0.15 * coalesce(score_quantified_cost, 0)
    + 0.15 * coalesce(score_ai_economics, 0)
    + 0.10 * coalesce(score_owner_budget, 0)
    + 0.10 * coalesce(score_narrow_wedge, 0)
    + 0.05 * coalesce(6 - score_reg_friction, 0)
  , 2)) stored,
  status text not null default 'Candidate' check (status in ('Candidate','Shortlisted','Selected','Dropped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Observations ─────────────────────────
create table observations (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references interviews(id) on delete cascade,
  workflow_step text,
  problem_statement text not null,
  quote text,
  frequency_text text,
  frequency_per_month numeric check (frequency_per_month >= 0),
  time_spent_hours numeric check (time_spent_hours >= 0),
  cost_estimate text,
  current_solution text,
  workaround text,
  evidence_type text not null default 'Stated' check (evidence_type in ('Stated','Documented','Paid-for')),
  severity int check (severity between 1 and 5),
  tags text[] not null default '{}',
  cluster_id uuid references clusters(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on interviews (contact_id);
create index on observations (interview_id);
create index on observations (cluster_id);
create index on contacts (status);
create index on contacts (referred_by);

-- ───────────────────────── Computed cluster stats ─────────────────────────
create view cluster_stats with (security_invoker = true) as
select
  c.*,
  count(distinct i.contact_id)::int as interviewee_count,
  count(distinct nullif(lower(trim(ct.company)), ''))::int as company_count,
  count(o.id)::int as observation_count,
  coalesce(bool_or(o.evidence_type = 'Paid-for'), false) as has_paid_evidence,
  (count(distinct i.contact_id) >= 5
    and count(distinct nullif(lower(trim(ct.company)), '')) >= 2
    and coalesce(bool_or(o.evidence_type = 'Paid-for'), false)) as passes_entry_bar
from clusters c
left join observations o on o.cluster_id = c.id
left join interviews i on i.id = o.interview_id
left join contacts ct on ct.id = i.contact_id
group by c.id;

-- ───────────────────────── Dashboard config (seeded) ─────────────────────────
create table kpi_targets (
  metric text not null check (metric in ('outreach_sent','interviews_done')),
  due_date date not null,
  target int not null,
  primary key (metric, due_date)
);

create table gates (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  title text not null,
  done boolean not null default false
);

-- ───────────────────────── Triggers ─────────────────────────
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger contacts_updated before update on contacts for each row execute function touch_updated_at();
create trigger interviews_updated before update on interviews for each row execute function touch_updated_at();
create trigger clusters_updated before update on clusters for each row execute function touch_updated_at();
create trigger observations_updated before update on observations for each row execute function touch_updated_at();

-- First time a contact leaves "Target", stamp the outreach date.
create or replace function stamp_first_contacted() returns trigger language plpgsql as $$
begin
  if new.status <> 'Target' and new.first_contacted_on is null then
    new.first_contacted_on := coalesce(new.last_touch_date, current_date);
  end if;
  return new;
end $$;

create trigger contacts_first_contacted before insert or update on contacts
  for each row execute function stamp_first_contacted();

-- ───────────────────────── Security (RLS) ─────────────────────────
alter table allowed_users enable row level security;
alter table contacts enable row level security;
alter table interviews enable row level security;
alter table observations enable row level security;
alter table clusters enable row level security;
alter table kpi_targets enable row level security;
alter table gates enable row level security;

create policy team_all on contacts for all to authenticated using (is_team()) with check (is_team());
create policy team_all on interviews for all to authenticated using (is_team()) with check (is_team());
create policy team_all on observations for all to authenticated using (is_team()) with check (is_team());
create policy team_all on clusters for all to authenticated using (is_team()) with check (is_team());
create policy team_all on kpi_targets for all to authenticated using (is_team()) with check (is_team());
create policy team_all on gates for all to authenticated using (is_team()) with check (is_team());
-- allowed_users: no policies → not readable/writable via the API. Edit it in the SQL editor only.

revoke all on all tables in schema public from anon;
