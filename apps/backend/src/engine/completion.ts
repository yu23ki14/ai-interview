import type { CaseSlots } from "./stage.js";

interface WeightedField {
	key: keyof CaseSlots;
	weight: number;
}

const REQUIRED_FIELDS: WeightedField[] = [
	{ key: "case_type", weight: 0.1 },
	{ key: "first_touch_channel", weight: 0.1 },
	{ key: "was_ad", weight: 0.1 },
	{ key: "money_sent", weight: 0.1 },
	{ key: "why_it_felt_believable", weight: 0.1 },
];

const SEMI_REQUIRED_FIELDS: WeightedField[] = [
	{ key: "ad_platform", weight: 0.05 },
	{ key: "claimed_role", weight: 0.05 },
	{ key: "moved_to_external_channel", weight: 0.05 },
	{ key: "warning_signs_noticed", weight: 0.05 },
	{ key: "emotions_during", weight: 0.05 },
	{ key: "emotions_after", weight: 0.05 },
];

const NICE_TO_HAVE_FIELDS: WeightedField[] = [
	{ key: "estimated_amount_jpy", weight: 0.025 },
	{ key: "non_monetary_harm", weight: 0.025 },
	{ key: "what_platform_design_might_have_helped", weight: 0.025 },
	{ key: "what_public_warning_might_have_helped", weight: 0.025 },
	{ key: "what_information_or_support_might_have_helped", weight: 0.025 },
	{ key: "what_should_be_improved_first", weight: 0.025 },
];

function isFilled(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	if (Array.isArray(value)) return value.length > 0;
	return true;
}

export function calculateCompletionScore(slots: CaseSlots): number {
	let score = 0;
	const allFields = [...REQUIRED_FIELDS, ...SEMI_REQUIRED_FIELDS, ...NICE_TO_HAVE_FIELDS];

	for (const field of allFields) {
		if (field.key === "money_sent") {
			// Either money_sent or attempt_stopped_before_payment counts
			if (isFilled(slots.money_sent) || isFilled(slots.attempt_stopped_before_payment)) {
				score += field.weight;
			}
			continue;
		}
		if (isFilled(slots[field.key])) {
			score += field.weight;
		}
	}

	return Math.round(score * 1000) / 1000;
}

export function getMissingFields(slots: CaseSlots): string[] {
	const missing: string[] = [];
	const allFields = [...REQUIRED_FIELDS, ...SEMI_REQUIRED_FIELDS, ...NICE_TO_HAVE_FIELDS];

	for (const field of allFields) {
		if (field.key === "money_sent") {
			if (!isFilled(slots.money_sent) && !isFilled(slots.attempt_stopped_before_payment)) {
				missing.push("money_sent");
			}
			continue;
		}
		if (!isFilled(slots[field.key])) {
			missing.push(field.key);
		}
	}

	return missing;
}
