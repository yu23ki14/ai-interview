import { Link, useNavigate } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useGetApiAdminSessions } from "../../src/api/gen/aIInterviewAPI";

function scoreColor(score: number): string {
	if (score >= 0.8) return "text-emerald-600";
	if (score >= 0.6) return "text-blue-600";
	if (score >= 0.4) return "text-amber-600";
	return "text-muted-foreground";
}

function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString("ja-JP", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function AdminPage() {
	const navigate = useNavigate();

	const sessionsQuery = useGetApiAdminSessions();

	const sessions = sessionsQuery.data?.status === 200 ? sessionsQuery.data.data : [];

	return (
		<div className="mx-auto min-h-dvh max-w-4xl p-4">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">管理画面</h1>
				<div className="flex gap-2">
					<Button asChild variant="outline" size="sm">
						<Link to="/admin/rubrics">ルーブリック管理</Link>
					</Button>
					<Button asChild variant="outline" size="sm">
						<Link to="/">トップへ</Link>
					</Button>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-lg">インタビューセッション一覧</CardTitle>
				</CardHeader>
				<CardContent>
					{sessionsQuery.isLoading && (
						<p className="text-sm text-muted-foreground">読み込み中...</p>
					)}
					{sessionsQuery.isError && (
						<p className="text-sm text-destructive">セッション一覧の取得に失敗しました。</p>
					)}
					{sessions.length === 0 && !sessionsQuery.isLoading && (
						<p className="text-sm text-muted-foreground">セッションはまだありません。</p>
					)}
					{sessions.length > 0 && (
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b text-left text-muted-foreground">
										<th className="pb-2 pr-4 font-medium">ID</th>
										<th className="pb-2 pr-4 font-medium">ステージ</th>
										<th className="pb-2 pr-4 font-medium">完了度</th>
										<th className="pb-2 font-medium">開始日時</th>
									</tr>
								</thead>
								<tbody>
									{sessions.map((session) => (
										<tr
											key={session.id}
											className="cursor-pointer border-b transition-colors last:border-b-0 hover:bg-muted/50"
											onClick={() => navigate(`/admin/sessions/${session.id}`)}
										>
											<td className="py-3 pr-4 font-mono text-xs">{session.id.slice(0, 8)}...</td>
											<td className="py-3 pr-4">
												<Badge variant="secondary">{session.stage}</Badge>
											</td>
											<td
												className={`py-3 pr-4 font-medium ${scoreColor(session.completionScore)}`}
											>
												{Math.round(session.completionScore * 100)}%
											</td>
											<td className="py-3 text-muted-foreground">
												{formatDate(session.startedAt)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
