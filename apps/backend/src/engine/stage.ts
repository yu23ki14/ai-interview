export type Stage =
	| "intro"
	| "narrative"
	| "clarify_entry_point"
	| "clarify_flow"
	| "clarify_harm"
	| "clarify_psychology"
	| "clarify_prevention"
	| "wrap_up"
	| "stop";

export interface CaseSlots {
	case_type?: string | null;
	first_touch_channel?: string | null;
	was_ad?: boolean | null;
	ad_platform?: string | null;
	claimed_role?: string[] | null;
	moved_to_external_channel?: boolean | null;
	money_sent?: boolean | null;
	attempt_stopped_before_payment?: boolean | null;
	estimated_amount_jpy?: number | null;
	why_it_felt_believable?: string[] | null;
	warning_signs_noticed?: string[] | null;
	emotions_during?: string[] | null;
	emotions_after?: string[] | null;
	non_monetary_harm?: string[] | null;
	what_platform_design_might_have_helped?: string[] | null;
	what_public_warning_might_have_helped?: string[] | null;
	what_information_or_support_might_have_helped?: string[] | null;
	what_should_be_improved_first?: string[] | null;
}

function isFilled(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	if (Array.isArray(value)) return value.length > 0;
	return true;
}

function isFilledOrSkipped(
	value: unknown,
	slotName: string,
	skippedSlots: string[],
): boolean {
	if (skippedSlots.includes(slotName)) return true;
	return isFilled(value);
}

export function determineStage(slots: CaseSlots, skippedSlots: string[] = []): Stage {
	if (!isFilledOrSkipped(slots.case_type, "case_type", skippedSlots)) {
		return "narrative";
	}

	if (
		!isFilledOrSkipped(slots.first_touch_channel, "first_touch_channel", skippedSlots) ||
		!isFilledOrSkipped(slots.was_ad, "was_ad", skippedSlots)
	) {
		return "clarify_entry_point";
	}

	if (!isFilledOrSkipped(slots.moved_to_external_channel, "moved_to_external_channel", skippedSlots)) {
		return "clarify_flow";
	}

	if (
		!isFilledOrSkipped(slots.money_sent, "money_sent", skippedSlots) &&
		!isFilledOrSkipped(slots.attempt_stopped_before_payment, "attempt_stopped_before_payment", skippedSlots)
	) {
		return "clarify_harm";
	}

	if (!isFilledOrSkipped(slots.why_it_felt_believable, "why_it_felt_believable", skippedSlots)) {
		return "clarify_psychology";
	}

	if (
		!isFilledOrSkipped(slots.what_platform_design_might_have_helped, "what_platform_design_might_have_helped", skippedSlots) &&
		!isFilledOrSkipped(slots.what_should_be_improved_first, "what_should_be_improved_first", skippedSlots)
	) {
		return "clarify_prevention";
	}

	return "wrap_up";
}
