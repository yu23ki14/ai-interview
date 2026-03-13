import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "AIインタビューシステム" },
		{ name: "description", content: "AIを活用した構造化インタビュープラットフォーム" },
	];
}

export default function Home() {
	return (
		<div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
			<Card className="w-full max-w-lg">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl">AIインタビューシステム</CardTitle>
					<CardDescription className="text-base">
						AIが対話を通じて、あなたの体験を丁寧にお聞きします。
						収集された情報は、社会課題の解決や政策提言に活用されます。
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<Button asChild size="lg" className="w-full">
						<Link to="/survey/demo">デモ調査を試す</Link>
					</Button>
					<Button asChild variant="outline" size="lg" className="w-full">
						<Link to="/admin">管理画面</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
