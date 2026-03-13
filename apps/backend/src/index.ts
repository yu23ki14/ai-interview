import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import surveyRoutes from "./routes/surveys.js";
import sessionRoutes from "./routes/sessions.js";
import messageRoutes from "./routes/messages.js";
import summaryRoutes from "./routes/summary.js";
import adminRoutes from "./routes/admin.js";

type Bindings = {
	DB: D1Database;
	ENVIRONMENT: string;
	ANTHROPIC_API_KEY: string;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>({
	defaultHook: (result, c) => {
		if (!result.success) {
			return c.json({ error: "Validation Error", details: result.error.flatten() }, 422);
		}
	},
});

app.use("/*", logger());
app.use("/*", cors({ origin: "http://localhost:5173" }));

app.get("/", (c) => c.json({ message: "Hello Hono!" }));

// Mount routes
app.route("/", surveyRoutes);
app.route("/", sessionRoutes);
app.route("/", messageRoutes);
app.route("/", summaryRoutes);
app.route("/", adminRoutes);

// OpenAPI JSON エンドポイント
app.doc("/api/openapi.json", {
	openapi: "3.0.0",
	info: { title: "AI Interview API", version: "1.0.0" },
	servers: [{ url: "http://localhost:8787", description: "Local" }],
});

// Swagger UI
app.get("/api/docs", swaggerUI({ url: "/api/openapi.json" }));

export default app;
