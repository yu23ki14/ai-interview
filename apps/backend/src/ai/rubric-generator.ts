import type { AnthropicProvider } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import { SLOT_LABELS } from "../engine/slots.js";

const SLOT_DESCRIPTIONS: Record<string, string> = {
	why_it_felt_believable:
		"Why the scam seemed believable or trustworthy at the time. Covers trust signals, social proof, and psychological triggers.",
	warning_signs_noticed:
		"Warning signs the participant noticed during or after — something that felt off, even if they ignored it.",
	emotions_during: "What the participant felt during a specific moment of the experience.",
	emotions_after:
		"What the participant felt after realizing the situation — anger, regret, self-blame, etc.",
	non_monetary_harm:
		"Whether the experience affected their daily life beyond money — sleep, relationships, trust in others.",
	what_platform_design_might_have_helped:
		"Whether there was a moment where a warning or confirmation step could have made them pause.",
	what_public_warning_might_have_helped:
		"Whether they had seen any warnings about this type of scam before, or whether more information would have helped.",
	what_information_or_support_might_have_helped:
		"Any information or support they wish they had before or during the experience.",
};

const RUBRIC_GENERATION_PROMPT = `You are an evaluation criteria designer for a civic research interview system.

Given a set of exemplary answers that a researcher has selected as "good answers"
for a specific interview slot, analyze their common qualities and generate
a structured rubric for evaluating answer detail level.

Generate a rubric with 3-5 evaluation dimensions. For each dimension:
1. Give it a clear Japanese name
2. Describe what it measures
3. Assign a weight (all weights must sum to 1.0)
4. Define 3-4 levels (0.0, 0.3/0.5, 0.6/0.7, 1.0) with concrete descriptions

The rubric should capture what makes these answers valuable for research purposes.
Focus on aspects that are consistently present across the exemplary answers.`;

const rubricDimensionSchema = z.object({
	name: z.string().describe("Dimension name in Japanese"),
	description: z.string().describe("What this dimension measures"),
	weight: z.number().min(0).max(1).describe("Weight of this dimension (all must sum to 1.0)"),
	levels: z
		.record(z.string(), z.string())
		.describe("Score levels mapping (e.g. '0.0', '0.3', '0.6', '1.0') to descriptions"),
});

const rubricSchema = z.object({
	slot_key: z.string(),
	version: z.number(),
	dimensions: z.array(rubricDimensionSchema).min(3).max(5),
});

export type RubricCriteria = z.infer<typeof rubricSchema>;

interface ExemplarInput {
	rawText: string;
	extractedValue: unknown;
	notes: string | null;
}

export async function generateRubric(
	provider: AnthropicProvider,
	slotKey: string,
	exemplars: ExemplarInput[],
): Promise<RubricCriteria> {
	const slotLabel = SLOT_LABELS[slotKey] ?? slotKey;
	const slotDescription = SLOT_DESCRIPTIONS[slotKey] ?? slotKey;

	const exemplarList = exemplars
		.map(
			(e, i) =>
				`Example ${i + 1}:\n  Raw text: "${e.rawText}"\n  Extracted value: ${JSON.stringify(e.extractedValue)}`,
		)
		.join("\n\n");

	const notesList = exemplars
		.filter((e) => e.notes)
		.map((e, i) => `Example ${i + 1}: ${e.notes}`)
		.join("\n");

	const { object } = await generateObject({
		model: provider("claude-sonnet-4-20250514"),
		schema: rubricSchema,
		system: RUBRIC_GENERATION_PROMPT,
		prompt: `Slot: ${slotKey} (${slotLabel})
Slot description: ${slotDescription}

Exemplary answers:
${exemplarList}

${notesList ? `Researcher notes on these answers:\n${notesList}` : "No researcher notes provided."}

Generate the rubric with slot_key set to "${slotKey}" and version set to 1.`,
	});

	return object;
}
