import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("survey/:surveyId", "routes/survey.tsx"),
	route("interview/:sessionId", "routes/interview.tsx"),
	route("complete/:sessionId", "routes/complete.tsx"),
	route("admin", "routes/admin.tsx"),
	route("admin/sessions/:sessionId", "routes/admin-detail.tsx"),
] satisfies RouteConfig;
