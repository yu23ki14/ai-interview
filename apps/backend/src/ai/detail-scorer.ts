import type { AnthropicProvider } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

const DETAIL_SCORING_PROMPT = `You are an answer quality evaluator for a civic research interview about online advertisement scams.

Evaluate the detail level of the participant's answer for a specific interview slot.
Score the overall detail from 0.0 to 1.0 based on these aspects:
- Specificity: Does the answer include concrete details, proper nouns, or specific situations?
- Multi-faceted: Are multiple perspectives or reasons provided?
- Psychological depth: Is the inner thought process or emotional journey described?
- Temporal context: Is there a sense of time progression or sequence?

Consider each aspect and provide an overall weighted score.`;

const detailScoreResultSchema = z.object({
	dimension_scores: z.array(
		z.object({
			name: z.string(),
			score: z.number().describe("0.0 to 1.0"),
			reason: z.string(),
		}),
	),
	overall_score: z.number().describe("0.0 to 1.0"),
});

export type DetailScoreResult = z.infer<typeof detailScoreResultSchema>;

interface RubricCriteria {
	slot_key: string;
	version: number;
	dimensions: {
		name: string;
		description: string;
		weight: number;
		levels: Record<string, string>;
	}[];
}

export async function scoreDetail(
	provider: AnthropicProvider,
	slotKey: string,
	extractedValue: unknown,
	rubric?: RubricCriteria | null,
	sampleText?: string | null,
): Promise<DetailScoreResult> {
	let rubricSection: string;

	if (rubric) {
		rubricSection = `Evaluation rubric:\n${JSON.stringify(rubric, null, 2)}\n\nScore each dimension according to the defined levels.`;
	} else if (sampleText) {
		rubricSection =
			`Reference sample answer (represents approximately 80% detail level):\n${sampleText}\n\n` +
			`Compare the participant's answer to this reference.\n` +
			`Consider: specificity, multi-faceted reasoning, psychological process, temporal context.`;
	} else {
		rubricSection =
			"No rubric available. Use your general assessment based on specificity, multi-faceted reasoning, psychological process, and temporal context.";
	}

	const { object } = await generateObject({
		model: provider("claude-haiku-4-5-20251001"),
		schema: detailScoreResultSchema,
		system: DETAIL_SCORING_PROMPT,
		prompt: `Slot: ${slotKey}
Extracted structured value: ${JSON.stringify(extractedValue)}

${rubricSection}

Evaluate the detail level and return scores.`,
	});

	return object;
}

/**
 * Score multiple slots in parallel for efficiency.
 * Returns a map of slotKey -> score.
 */
export async function scoreDetailBatch(
	provider: AnthropicProvider,
	slotsToScore: Array<{ slotKey: string; extractedValue: unknown }>,
	rubrics: Map<string, RubricCriteria>,
	sampleExemplars?: Map<string, { rawText: string }>,
): Promise<Record<string, number>> {
	const results = await Promise.all(
		slotsToScore.map(async ({ slotKey, extractedValue }) => {
			const rubric = rubrics.get(slotKey) ?? null;
			const sampleText = rubric ? null : (sampleExemplars?.get(slotKey)?.rawText ?? null);
			const result = await scoreDetail(provider, slotKey, extractedValue, rubric, sampleText);
			return { slotKey, score: result.overall_score };
		}),
	);

	const scoreMap: Record<string, number> = {};
	for (const { slotKey, score } of results) {
		scoreMap[slotKey] = score;
	}
	return scoreMap;
}
