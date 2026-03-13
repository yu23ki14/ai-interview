import { useNavigate, useParams } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { useGetApiSurveysId, usePostApiSessions } from "../../src/api/gen/aIInterviewAPI";

export default function SurveyPage() {
	const { surveyId } = useParams();
	const navigate = useNavigate();

	const surveyQuery = useGetApiSurveysId(surveyId!, {
		query: { enabled: !!surveyId },
	});

	const createSessionMutation = usePostApiSessions({
		mutation: {
			onSuccess: (result) => {
				if (result.status === 201) {
					navigate(`/interview/${result.data.session.id}`);
				}
			},
		},
	});

	if (surveyQuery.isLoading) {
		return (
			<div className="flex min-h-dvh items-center justify-center">
				<p className="text-muted-foreground">読み込み中...</p>
			</div>
		);
	}

	if (surveyQuery.isError) {
		return (
			<div className="flex min-h-dvh items-center justify-center p-4">
				<Card className="w-full max-w-lg">
					<CardHeader className="text-center">
						<CardTitle className="text-xl">エラーが発生しました</CardTitle>
						<CardDescription>
							調査情報の取得に失敗しました。しばらくしてからもう一度お試しください。
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	const survey = surveyQuery.data?.status === 200 ? surveyQuery.data.data : null;

	return (
		<div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
			<Card className="w-full max-w-lg">
				<CardHeader>
					<CardTitle className="text-xl">{survey?.title}</CardTitle>
					<CardDescription className="text-base">{survey?.description}</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex items-center gap-2">
						<Badge variant="secondary">所要時間：約{survey?.estimatedMinutes}分</Badge>
					</div>
					<div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
						<p className="mb-2 font-medium text-foreground">ご協力にあたって</p>
						<ul className="flex flex-col gap-1.5">
							<li>- 回答は匿名で処理されます</li>
							<li>- 収集されたデータは調査・研究目的でのみ使用されます</li>
							<li>- いつでも中断することができます</li>
							<li>- 回答内容は暗号化して安全に保管されます</li>
						</ul>
					</div>
				</CardContent>
				<CardFooter>
					<Button
						size="lg"
						className="w-full"
						onClick={() => createSessionMutation.mutate({ data: { surveyId: surveyId! } })}
						disabled={createSessionMutation.isPending}
					>
						{createSessionMutation.isPending ? "準備中..." : "インタビューを開始する"}
					</Button>
				</CardFooter>
				{createSessionMutation.isError && (
					<div className="px-6 pb-4">
						<p className="text-sm text-destructive">
							セッションの作成に失敗しました。もう一度お試しください。
						</p>
					</div>
				)}
			</Card>
		</div>
	);
}
