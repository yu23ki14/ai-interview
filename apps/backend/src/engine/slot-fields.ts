/**
 * Mapping from interview slots to the extraction fields they primarily concern.
 * Used by the focused extractor to narrow down which fields to prioritise per turn.
 */

/** Fields that every slot shares (always extracted regardless of focus) */
export const COMMON_FIELDS = ["case_type", "severity_level", "incident_summary"] as const;

/**
 * Map of slot name → extraction field names that are the primary focus when
 * the interviewer is asking about that slot.
 */
export const SLOT_FIELD_MAP: Record<string, readonly string[]> = {
	case_type: ["case_type"],
	first_touch_channel: [
		"first_touch_channel",
		"first_touch_platform",
		"was_ad",
		"ad_format",
		"ad_platform",
		"ad_claim_type",
	],
	was_ad: ["was_ad", "ad_format", "ad_platform", "ad_claim_type"],
	ad_platform: ["ad_platform", "ad_format", "ad_claim_type"],
	claimed_role: [
		"claimed_role",
		"claimed_affiliation",
		"trust_signal",
		"identity_verification_claim",
	],
	moved_to_external_channel: ["moved_to_external_channel", "external_channels"],
	money_sent: [
		"money_sent",
		"estimated_amount_jpy",
		"attempt_stopped_before_payment",
		"asked_for_payment",
		"asked_for_bank_transfer",
		"asked_for_crypto_transfer",
	],
	estimated_amount_jpy: ["estimated_amount_jpy", "money_sent"],
	why_it_felt_believable: [
		"why_it_felt_believable",
		"warning_signs_noticed",
		"why_warning_signs_did_not_stop_action",
	],
	warning_signs_noticed: ["warning_signs_noticed", "why_warning_signs_did_not_stop_action"],
	emotions_during: ["emotions_during"],
	emotions_after: ["emotions_after"],
	non_monetary_harm: ["non_monetary_harm", "felt_in_danger"],
	what_platform_design_might_have_helped: ["what_platform_design_might_have_helped"],
	what_public_warning_might_have_helped: ["what_public_warning_might_have_helped"],
	what_information_or_support_might_have_helped: ["what_information_or_support_might_have_helped"],
	what_should_be_improved_first: ["what_should_be_improved_first"],
};

/** Human-readable Japanese labels for extraction fields (used in focus prompts) */
export const FIELD_LABELS: Record<string, string> = {
	case_type: "ケースの種別（被害者/未遂/家族）",
	severity_level: "深刻度",
	incident_summary: "事案の概要",
	first_touch_channel: "最初の接点チャネル",
	first_touch_platform: "最初のプラットフォーム",
	was_ad: "広告だったか",
	ad_format: "広告の形式",
	ad_platform: "広告の掲載先",
	ad_claim_type: "広告の謳い文句",
	claimed_role: "相手の名乗り",
	claimed_affiliation: "相手の所属先",
	trust_signal: "信頼させる手口",
	identity_verification_claim: "本人確認の主張",
	moved_to_external_channel: "別チャネルへの誘導",
	external_channels: "誘導先チャネル",
	asked_for_payment: "送金の要求",
	asked_for_registration: "登録の要求",
	asked_for_id_submission: "身分証の要求",
	asked_for_app_install: "アプリインストールの要求",
	asked_for_remote_control: "遠隔操作の要求",
	asked_for_crypto_transfer: "暗号資産送金の要求",
	asked_for_bank_transfer: "銀行振込の要求",
	money_sent: "送金の有無",
	estimated_amount_jpy: "おおよその金額",
	non_monetary_harm: "金銭以外の被害",
	attempt_stopped_before_payment: "送金前に止められたか",
	felt_in_danger: "身の危険を感じたか",
	why_it_felt_believable: "信じてしまった理由",
	warning_signs_noticed: "違和感を覚えた点",
	why_warning_signs_did_not_stop_action: "違和感があっても止められなかった理由",
	emotions_during: "体験中の感情",
	emotions_after: "体験後の感情",
	has_screenshot: "スクリーンショットの有無",
	has_chat_log: "チャットログの有無",
	has_transfer_record: "送金記録の有無",
	has_ad_image_or_url: "広告画像/URLの有無",
	has_account_identifier: "アカウント情報の有無",
	what_platform_design_might_have_helped: "あれば助かったプラットフォーム機能",
	what_public_warning_might_have_helped: "あれば助かった注意喚起",
	what_information_or_support_might_have_helped: "あれば助かった情報・支援",
	what_should_be_improved_first: "最優先で改善してほしいこと",
};

/**
 * Get the list of focused field names for a given slot.
 * Returns undefined if no mapping exists (= extract all fields).
 */
export function getFocusFields(slot: string): readonly string[] | undefined {
	return SLOT_FIELD_MAP[slot];
}
