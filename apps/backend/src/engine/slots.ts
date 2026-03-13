import type { CaseSlots } from "./stage.js";

const SLOT_PRIORITY: (keyof CaseSlots)[] = [
	"case_type",
	"first_touch_channel",
	"was_ad",
	"ad_platform",
	"claimed_role",
	"moved_to_external_channel",
	"money_sent",
	"estimated_amount_jpy",
	"why_it_felt_believable",
	"warning_signs_noticed",
	"what_platform_design_might_have_helped",
	"what_should_be_improved_first",
];

function isFilled(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	if (Array.isArray(value)) return value.length > 0;
	return true;
}

export function getNextSlot(slots: CaseSlots): string | null {
	// Special handling: if money_sent is false, check attempt_stopped_before_payment instead
	for (const slot of SLOT_PRIORITY) {
		if (slot === "money_sent") {
			if (!isFilled(slots.money_sent) && !isFilled(slots.attempt_stopped_before_payment)) {
				return "money_sent";
			}
			continue;
		}
		if (!isFilled(slots[slot])) {
			return slot;
		}
	}
	return null;
}
