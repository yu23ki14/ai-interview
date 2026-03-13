import { Link, useParams } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useGetApiSessionsId } from "../../src/api/gen/aIInterviewAPI";

export default function CompletePage() {
	const { sessionId } = useParams();

	useGetApiSessionsId(sessionId!, {
		query: { enabled: !!sessionId },
	});

	return (
		<div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
			<Card className="w-full max-w-lg text-center">
				<CardHeader>
					<CardTitle className="text-2xl">ご協力ありがとうございました</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					<p className="text-muted-foreground">
						貴重なお話をお聞かせいただき、誠にありがとうございます。
						いただいた情報は、社会課題の解決に向けた調査・研究に 大切に活用させていただきます。
					</p>

					<p className="text-sm text-muted-foreground">
						もし何かお困りのことがあれば、消費者ホットライン（188）にご相談ください。
					</p>

					<div className="flex flex-col gap-2">
						<Button asChild variant="outline">
							<Link to="/">トップページへ戻る</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
