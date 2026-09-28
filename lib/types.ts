import type { ScoreKey } from './options';

export type Contact = {
  id: string;
  name: string;
  title: string | null;
  function: string | null;
  seniority: string | null;
  company: string | null;
  company_type: string | null;
  country: string | null;
  linkedin_url: string | null;
  hunting_ground: string | null;
  source: string | null;
  referred_by: string | null;
  referred_in_interview: string | null;
  owner: string | null;
  status: string;
  first_contacted_on: string | null;
  meeting_at: string | null;
  last_touch_date: string | null;
  next_action: string | null;
  next_action_date: string | null;
  notes: string | null;
  created_at: string;
};

export type Interview = {
  id: string;
  contact_id: string;
  date: string;
  interviewers: string;
  duration_min: number | null;
  workflow_discussed: string | null;
  notes: string | null;
  transcript: string | null;
  recording_url: string | null;
  consent_to_record: boolean;
  magic_button_answer: string | null;
  logged_within_30_min: boolean;
};

export type Observation = {
  id: string;
  interview_id: string;
  workflow_step: string | null;
  problem_statement: string;
  quote: string | null;
  frequency_text: string | null;
  frequency_per_month: number | null;
  time_spent_hours: number | null;
  cost_estimate: string | null;
  current_solution: string | null;
  workaround: string | null;
  evidence_type: string;
  severity: number | null;
  tags: string[];
  cluster_id: string | null;
};

export type Cluster = {
  id: string;
  name: string;
  description: string | null;
  hunting_ground: string | null;
  owner_persona: string | null;
  competitors_alternatives: string | null;
  weighted_score: number;
  status: string;
} & Record<ScoreKey, number | null>;

export type ClusterStats = Cluster & {
  interviewee_count: number;
  company_count: number;
  observation_count: number;
  has_paid_evidence: boolean;
  passes_entry_bar: boolean;
};

export type ActionResult = { error?: string } | void;
