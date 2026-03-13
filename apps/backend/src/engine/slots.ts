import type { CaseSlots } from "./stage.js";

export const SLOT_PRIORITY: (keyof CaseSlots)[] = [
	"first_touch_channel",
	"case_type",
	"was_ad",
	"ad_platform",
	"claimed_role",
	"moved_to_external_channel",
	"money_sent",
	"estimated_amount_jpy",
	"why_it_felt_believable",
	"warning_signs_noticed",
	"emotions_during",
	"emotions_after",
	"non_monetary_harm",
	"what_platform_design_might_have_helped",
	"what_public_warning_might_have_helped",
	"what_information_or_support_might_have_helped",
	"what_should_be_improved_first",
];

export const SLOT_LABELS: Record<string, string> = {
	first_touch_channel: "最初の接点",
	case_type: "ご本人の立場",
	was_ad: "広告かどうか",
	ad_platform: "広告の掲載先",
	claimed_role: "相手の名乗り",
	moved_to_external_channel: "別の連絡手段への誘導",
	money_sent: "送金の有無",
	estimated_amount_jpy: "おおよその金額",
	why_it_felt_believable: "信じた理由",
	warning_signs_noticed: "違和感を覚えた点",
	emotions_during: "体験中の気持ち",
	emotions_after: "その後の気持ち",
	non_monetary_harm: "お金以外の影響",
	what_platform_design_might_have_helped: "あれば助かった仕組み",
	what_public_warning_might_have_helped: "事前の注意喚起",
	what_information_or_support_might_have_helped: "あれば助かった情報",
	what_should_be_improved_first: "改善してほしいこと",
};

function isFilled(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	if (Array.isArray(value)) return value.length > 0;
	return true;
}

export function getNextSlot(slots: CaseSlots, skippedSlots: string[] = []): string | null {
	for (const slot of SLOT_PRIORITY) {
		if (skippedSlots.includes(slot)) continue;

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

export function getRemainingSlots(slots: CaseSlots, skippedSlots: string[] = []): string[] {
	const remaining: string[] = [];
	for (const slot of SLOT_PRIORITY) {
		if (skippedSlots.includes(slot)) continue;

		if (slot === "money_sent") {
			if (!isFilled(slots.money_sent) && !isFilled(slots.attempt_stopped_before_payment)) {
				remaining.push(slot);
			}
			continue;
		}
		if (!isFilled(slots[slot])) {
			remaining.push(slot);
		}
	}
	return remaining;
}

export function getSlotLabel(slot: string): string {
	return SLOT_LABELS[slot] ?? slot;
}
