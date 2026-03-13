import { useState } from "react";
import { Link, useParams } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import {
	useGetApiAdminSessionsId,
	usePostApiAdminExemplars,
} from "../../src/api/gen/aIInterviewAPI";
import type { SlotCard } from "../../src/api/models";

function formatExtractedValue(value: unknown): React.ReactNode {
	if (value === null || value === undefined) {
		return <span className="text-muted-foreground italic">未回答</span>;
	}
	if (typeof value === "boolean") {
		return value ? "はい" : "いいえ";
	}
	if (typeof value === "number") {
		return String(value);
	}
	if (Array.isArray(value)) {
		if (value.length === 0) {
			return <span className="text-muted-foreground italic">未回答</span>;
		}
		return (
			<ul className="list-inside list-disc space-y-1">
				{value.map((item, i) => (
					<li key={`${i}-${String(item)}`}>{String(item)}</li>
				))}
			</ul>
		);
	}
	return String(value);
}

function SlotCardItem({
	slot,
	surveyId,
	sessionId,
	onPickedUp,
}: {
	slot: SlotCard;
	surveyId: string;
	sessionId: string;
	onPickedUp: () => void;
}) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [rawText, setRawText] = useState("");
	const [notes, setNotes] = useState("");

	const createExemplar = usePostApiAdminExemplars();

	const handleSave = () => {
		createExemplar.mutate(
			{
				data: {
					surveyId,
					sessionId,
					slotKey: slot.slotKey,
					rawText,
					extractedValue: slot.extractedValue,
					notes: notes || undefined,
				},
			},
			{
				onSuccess: () => {
					setDialogOpen(false);
					setRawText("");
					setNotes("");
					onPickedUp();
				},
			},
		);
	};

	return (
		<>
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-base">{slot.label}</CardTitle>
						<div className="flex items-center gap-2">
							{slot.isDetailScorable && <Badge variant="outline">詳細度対象</Badge>}
							{slot.isDetailScorable && slot.detailScore !== null && (
								<Badge variant="secondary">詳細度: {Math.round(slot.detailScore * 100)}%</Badge>
							)}
							{slot.isPickedUp && <Badge>ピックアップ済</Badge>}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="text-sm">{formatExtractedValue(slot.extractedValue)}</div>
					{slot.isDetailScorable && slot.isFilled && !slot.isPickedUp && (
						<Button
							variant="outline"
							size="sm"
							className="mt-3"
							onClick={() => setDialogOpen(true)}
						>
							良い回答としてピックアップ
						</Button>
					)}
				</CardContent>
			</Card>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>この回答を良い回答として保存</DialogTitle>
						<DialogDescription>
							{slot.label}（{slot.slotKey}）
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-4">
						<div>
							<label htmlFor="rawText" className="mb-1 block text-sm font-medium">
								回答者の原文（該当箇所）
							</label>
							<Textarea
								id="rawText"
								value={rawText}
								onChange={(e) => setRawText(e.target.value)}
								placeholder="該当する発言を貼り付けてください"
								rows={4}
							/>
						</div>
						<div>
							<label htmlFor="notes" className="mb-1 block text-sm font-medium">
								メモ（任意）
							</label>
							<Textarea
								id="notes"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="この回答が良い理由など"
								rows={2}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDialogOpen(false)}>
							キャンセル
						</Button>
						<Button onClick={handleSave} disabled={!rawText.trim() || createExemplar.isPending}>
							{createExemplar.isPending ? "保存中..." : "保存"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

export default function AdminDetailPage() {
	const { sessionId } = useParams();

	const detailQuery = useGetApiAdminSessionsId(sessionId ?? "", {
		query: { enabled: !!sessionId },
	});

	const [showRawJson, setShowRawJson] = useState(false);

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
					<p className="text-sm text-muted-foreground">セッション詳細の取得に失敗しました。</p>
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
								<dd className="font-medium">{Math.round(detail.session.completionScore * 100)}%</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">開始日時</dt>
								<dd>{new Date(detail.session.startedAt).toLocaleString("ja-JP")}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">完了日時</dt>
								<dd>
									{detail.session.completedAt
										? new Date(detail.session.completedAt).toLocaleString("ja-JP")
										: "-"}
								</dd>
							</div>
						</dl>
					</CardContent>
				</Card>

				{/* Slot cards */}
				{detail.slots && detail.slots.length > 0 && (
					<div className="flex flex-col gap-3">
						<h2 className="text-lg font-semibold">スロット別回答</h2>
						{detail.slots.map((slot) => (
							<SlotCardItem
								key={slot.slotKey}
								slot={slot}
								surveyId={detail.session.surveyId}
								sessionId={detail.session.id}
								onPickedUp={() => detailQuery.refetch()}
							/>
						))}
					</div>
				)}

				{/* Raw extracted case data (collapsible) */}
				{detail.extractedCase && (
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle className="text-lg">抽出データ（JSON）</CardTitle>
								<Button variant="ghost" size="sm" onClick={() => setShowRawJson(!showRawJson)}>
									{showRawJson ? "閉じる" : "表示"}
								</Button>
							</div>
						</CardHeader>
						{showRawJson && (
							<CardContent>
								<pre className="rounded-lg bg-muted/50 p-4 text-sm whitespace-pre-wrap">
									{JSON.stringify(detail.extractedCase, null, 2)}
								</pre>
							</CardContent>
						)}
					</Card>
				)}
			</div>
		</div>
	);
}
