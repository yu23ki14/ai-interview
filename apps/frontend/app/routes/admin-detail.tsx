import { Link, useParams } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useGetApiAdminSessionsId } from "../../src/api/gen/aIInterviewAPI";

export default function AdminDetailPage() {
	const { sessionId } = useParams();

	const detailQuery = useGetApiAdminSessionsId(sessionId!, {
		query: { enabled: !!sessionId },
	});

	if (detailQuery.isLoading) {
		return (
			<div className="flex min-h-dvh items-center justify-center">
				<p className="text-muted-foreground">読み込み中...</p>
			</div>
		);
	}

	if (detailQuery.isError) {
		return (
			<div className="flex min-h-dvh items-center justify-center p-4">
				<div className="text-center">
					<p className="mb-2 text-lg font-medium">エラーが発生しました</p>
					<p className="text-sm text-muted-foreground">
						セッション詳細の取得に失敗しました。
					</p>
					<Button asChild variant="outline" className="mt-4">
						<Link to="/admin">一覧に戻る</Link>
					</Button>
				</div>
			</div>
		);
	}

	const detail = detailQuery.data?.status === 200 ? detailQuery.data.data : null;
	if (!detail) return null;

	return (
		<div className="mx-auto min-h-dvh max-w-4xl p-4">
			<div className="mb-6">
				<Button asChild variant="outline" size="sm">
					<Link to="/admin">一覧に戻る</Link>
				</Button>
			</div>

			<div className="flex flex-col gap-6">
				{/* Session info */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">セッション情報</CardTitle>
					</CardHeader>
					<CardContent>
						<dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
							<div>
								<dt className="text-muted-foreground">ID</dt>
								<dd className="font-mono text-xs">{detail.session.id}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">ステージ</dt>
								<dd>
									<Badge variant="secondary">{detail.session.stage}</Badge>
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">完了度</dt>
								<dd className="font-medium">
									{Math.round(detail.session.completionScore * 100)}%
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">開始日時</dt>
								<dd>
									{new Date(detail.session.startedAt).toLocaleString("ja-JP")}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">完了日時</dt>
								<dd>
									{detail.session.completedAt
										? new Date(detail.session.completedAt).toLocaleString(
												"ja-JP",
											)
										: "-"}
								</dd>
							</div>
						</dl>
					</CardContent>
				</Card>

				{/* Extracted case data */}
				{detail.extractedCase && (
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">抽出データ</CardTitle>
						</CardHeader>
						<CardContent>
							<pre className="rounded-lg bg-muted/50 p-4 text-sm whitespace-pre-wrap">
								{JSON.stringify(detail.extractedCase, null, 2)}
							</pre>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
