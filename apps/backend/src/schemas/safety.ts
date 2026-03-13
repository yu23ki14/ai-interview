import { z } from "zod";

export const safetyAssessmentSchema = z.object({
	burden_level: z.number().describe("0-3 scale: 0=none, 1=mild, 2=moderate, 3=severe"),
	stop_intent: z.boolean(),
	risk_level: z.enum(["none", "low", "medium", "high"]),
	pii_detected: z.boolean(),
	secret_detected: z.boolean(),
	reasoning: z.string().optional(),
});

export type SafetyAssessment = z.infer<typeof safetyAssessmentSchema>;
