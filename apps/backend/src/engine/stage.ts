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
	what_platform_design_might_have_helped?: string[] | null;
	what_should_be_improved_first?: string[] | null;
}

function isFilled(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	if (Array.isArray(value)) return value.length > 0;
	return true;
}

export function determineStage(slots: CaseSlots): Stage {
	if (!isFilled(slots.case_type)) {
		return "narrative";
	}

	if (!isFilled(slots.first_touch_channel) || !isFilled(slots.was_ad)) {
		return "clarify_entry_point";
	}

	if (!isFilled(slots.moved_to_external_channel)) {
		return "clarify_flow";
	}

	if (
		!isFilled(slots.money_sent) &&
		!isFilled(slots.attempt_stopped_before_payment)
	) {
		return "clarify_harm";
	}

	if (!isFilled(slots.why_it_felt_believable)) {
		return "clarify_psychology";
	}

	if (
		!isFilled(slots.what_platform_design_might_have_helped) &&
		!isFilled(slots.what_should_be_improved_first)
	) {
		return "clarify_prevention";
	}

	return "wrap_up";
}
