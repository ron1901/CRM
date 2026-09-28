// Single source of truth for pick-lists. Must match the check constraints in supabase/schema.sql.
export const SENIORITY = ['IC', 'Manager', 'Director', 'VP+'] as const;
export const COMPANY_TYPES = ['Big Pharma', 'Mid-size', 'Biotech', 'CRO', 'Med-comms', 'Reg consultancy', 'Vendor', 'Other'] as const;
export const HUNTING_GROUNDS = ['Regulatory', 'Quality-GxP', 'PV-Medical Affairs', 'Other'] as const;
export const SOURCES = ['Warm intro', 'Zell network', 'Snowball referral', 'Cold LinkedIn', 'Community', 'Expert network'] as const;
export const OWNERS = ['Ron', 'Ronica'] as const;
export const INTERVIEWERS = ['Ron', 'Ronica', 'Both'] as const;
export const PIPELINE_STATUSES = ['Target', 'Contacted', 'Replied', 'Scheduled', 'Interviewed', 'Follow-up'] as const;
export const CLOSED_STATUSES = ['Declined', 'No response'] as const;
export const STATUSES = [...PIPELINE_STATUSES, ...CLOSED_STATUSES] as const;
export const EVIDENCE_TYPES = ['Stated', 'Documented', 'Paid-for'] as const;
export const CLUSTER_STATUSES = ['Candidate', 'Shortlisted', 'Selected', 'Dropped'] as const;

export const SCORE_CRITERIA = [
  { key: 'score_paid_pain', label: 'Paid-pain evidence', weight: 25 },
  { key: 'score_independent', label: 'Independent interviews/companies', weight: 20 },
  { key: 'score_quantified_cost', label: 'Quantified cost', weight: 15 },
  { key: 'score_ai_economics', label: 'AI changes economics', weight: 15 },
  { key: 'score_owner_budget', label: 'Clear owner with budget', weight: 10 },
  { key: 'score_narrow_wedge', label: 'Narrow buildable wedge', weight: 10 },
  { key: 'score_reg_friction', label: 'Regulatory friction (5 = high friction, reverse-scored)', weight: 5 },
] as const;
export type ScoreKey = (typeof SCORE_CRITERIA)[number]['key'];
