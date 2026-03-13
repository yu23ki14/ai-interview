import type { SafetyAssessment } from "../schemas/safety.js";

export interface StopCheckResult {
	shouldStop: boolean;
	reasons: string[];
}

export function checkShouldStop(safety: SafetyAssessment): StopCheckResult {
	const reasons: string[] = [];

	if (safety.burden_level >= 3) {
		reasons.push("burden_level_high");
	}

	if (safety.risk_level === "high") {
		reasons.push("risk_level_high");
	}

	if (safety.stop_intent) {
		reasons.push("stop_intent_detected");
	}

	if (safety.secret_detected) {
		reasons.push("secret_detected");
	}

	return {
		shouldStop: reasons.length > 0,
		reasons,
	};
}
