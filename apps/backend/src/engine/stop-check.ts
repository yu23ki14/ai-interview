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

	// secret_detected is recorded in safetyMeta but does not stop the session.
	// Actual secrets are handled by PII redaction.

	return {
		shouldStop: reasons.length > 0,
		reasons,
	};
}
