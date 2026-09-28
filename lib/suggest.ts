import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

const SuggestionSchema = z.object({
  observations: z.array(
    z.object({
      problem_statement: z.string(),
      quote: z.string().nullable(),
      workflow_step: z.string().nullable(),
      evidence_type: z.enum(['Stated', 'Documented', 'Paid-for']),
      severity: z.number().int().nullable(),
      frequency_text: z.string().nullable(),
      frequency_per_month: z.number().nullable(),
      time_spent_hours: z.number().nullable(),
      cost_estimate: z.string().nullable(),
      current_solution: z.string().nullable(),
      workaround: z.string().nullable(),
      tags: z.array(z.string()),
      cluster_name: z.string().nullable(),
    }),
  ),
});
export type Suggestion = z.infer<typeof SuggestionSchema>['observations'][number];

const SYSTEM = `You help a two-person founding team run customer-discovery interviews with pharma practitioners (Regulatory Affairs, Quality/GxP, Pharmacovigilance/Medical Affairs, CROs, med-comms agencies, regulatory consultancies). They are looking for one recurring, costly workflow problem worth building for.

From the interview material you are given, extract observations: one per distinct problem the interviewee described in their own work. The team will review every suggestion before saving it, so favour precision over volume and never invent facts.

For each observation:
- problem_statement: one clear sentence in English describing the problem from the interviewee's point of view.
- quote: the interviewee's most telling words, copied verbatim from the transcript in the original language. Null if there is no transcript or no good quote. Never paraphrase inside the quote.
- workflow_step: the step in their workflow where it happens (short), or null.
- evidence_type: "Paid-for" only if they already spend money on it (vendor, contractor, consultant, dedicated headcount or tool bought for it); "Documented" if they showed or referred to a concrete artefact (SOP, tracker, spreadsheet, tickets, audit finding); otherwise "Stated".
- severity 1-5: 1 minor annoyance, 3 real recurring cost, 5 severe (compliance risk, large cost, blocks work). Null if you cannot judge.
- frequency_text as they said it; frequency_per_month normalised to times per month (e.g. weekly = 4.3, every batch at 10 batches/month = 10). Null when not stated.
- time_spent_hours: hours each occurrence, only if stated or clearly implied.
- cost_estimate: money or effort figures as stated (e.g. "€60k/yr vendor"), else null.
- current_solution / workaround: what they do today, if mentioned.
- tags: 1-4 short lowercase topic tags (e.g. "variations", "literature-screening", "capa").
- cluster_name: if the problem clearly belongs to one of the existing problem clusters listed, its exact name; otherwise null. Never invent a cluster name.

Skip generic small talk, the interviewers' own ideas, and problems the interviewee only speculated about for other people. Do not repeat problems listed as already logged.`;

export async function suggestObservations(input: {
  transcript: string | null;
  notes: string | null;
  workflow: string | null;
  magicButton: string | null;
  interviewee: string;
  alreadyLogged: string[];
  clusters: { name: string; description: string | null }[];
}): Promise<{ suggestions?: Suggestion[]; error?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: 'AI suggestions are not set up yet: add ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables, then redeploy.' };
  }
  const parts = [
    `Interviewee: ${input.interviewee}`,
    input.workflow && `Workflow discussed: ${input.workflow}`,
    input.magicButton && `"Magic button" answer: ${input.magicButton}`,
    input.clusters.length > 0 &&
      `Existing problem clusters:\n${input.clusters.map((c) => `- ${c.name}${c.description ? `: ${c.description}` : ''}`).join('\n')}`,
    input.alreadyLogged.length > 0 && `Already logged (do not repeat):\n- ${input.alreadyLogged.join('\n- ')}`,
    input.notes && `<interviewer_notes>\n${input.notes}\n</interviewer_notes>`,
    input.transcript && `<transcript>\n${input.transcript}\n</transcript>`,
  ].filter(Boolean);

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: betaZodOutputFormat(SuggestionSchema) },
      system: SYSTEM,
      messages: [{ role: 'user', content: parts.join('\n\n') }],
    });
    if (response.stop_reason === 'refusal') return { error: 'The AI declined to process this interview. Add observations manually.' };
    if (response.stop_reason === 'max_tokens' || !response.parsed_output) return { error: 'The AI response was incomplete. Try again.' };
    return {
      suggestions: response.parsed_output.observations.map((o) => ({
        ...o,
        severity: o.severity == null ? null : Math.min(5, Math.max(1, o.severity)),
      })),
    };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { error: 'The Anthropic API key is invalid. Check ANTHROPIC_API_KEY in Vercel.' };
    if (e instanceof Anthropic.RateLimitError) return { error: 'Rate limited by the AI service. Wait a minute and try again.' };
    if (e instanceof Anthropic.APIError) return { error: `AI service error (${e.status}). Try again.` };
    return { error: 'Could not reach the AI service. Try again.' };
  }
}
