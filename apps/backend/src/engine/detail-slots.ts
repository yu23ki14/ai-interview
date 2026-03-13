/**
 * 詳細度判定対象スロット（自由記述的なスロットのみ）
 */
export const DETAIL_SCORABLE_SLOTS = [
	"why_it_felt_believable",
	"warning_signs_noticed",
	"emotions_during",
	"emotions_after",
	"non_monetary_harm",
	"what_platform_design_might_have_helped",
	"what_public_warning_might_have_helped",
	"what_information_or_support_might_have_helped",
] as const;

export type DetailScorableSlot = (typeof DETAIL_SCORABLE_SLOTS)[number];

export function isDetailScorableSlot(slot: string): slot is DetailScorableSlot {
	return (DETAIL_SCORABLE_SLOTS as readonly string[]).includes(slot);
}

/**
 * スロットキー → extractedCases 内のネスト構造パス
 */
export const SLOT_TO_CASE_PATH: Record<DetailScorableSlot, string> = {
	why_it_felt_believable: "psychology.why_it_felt_believable",
	warning_signs_noticed: "psychology.warning_signs_noticed",
	emotions_during: "psychology.emotions_during",
	emotions_after: "psychology.emotions_after",
	non_monetary_harm: "harmOutcome.non_monetary_harm",
	what_platform_design_might_have_helped: "preventionSignal.what_platform_design_might_have_helped",
	what_public_warning_might_have_helped: "preventionSignal.what_public_warning_might_have_helped",
	what_information_or_support_might_have_helped:
		"preventionSignal.what_information_or_support_might_have_helped",
};

/**
 * ネストされたオブジェクトからドット区切りパスで値を取得する
 */
export function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
	const parts = path.split(".");
	let current: unknown = obj;
	for (const part of parts) {
		if (current === null || current === undefined || typeof current !== "object") {
			return undefined;
		}
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}
