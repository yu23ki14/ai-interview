import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Textarea } from "~/components/ui/textarea";
import {
	getGetApiSessionsIdMessagesQueryKey,
	getGetApiSessionsIdQueryKey,
	useGetApiSessionsId,
	useGetApiSessionsIdMessages,
	useGetApiSessionsIdSummary,
	usePostApiSessionsIdMessages,
} from "../../src/api/gen/aIInterviewAPI";
import type { TranscriptEntry } from "../../src/api/models";

const STAGES = [
	{ label: "概要理解", threshold: 0.2 },
	{ label: "基本情報確認", threshold: 0.4 },
	{ label: "詳細確認", threshold: 0.6 },
	{ label: "背景確認", threshold: 0.8 },
	{ label: "完了", threshold: 1.0 },
] as const;

function getStageInfo(score: number) {
	const idx = STAGES.findIndex((s) => score < s.threshold);
	const stageIndex = idx === -1 ? STAGES.length - 1 : idx;
	return { label: STAGES[stageIndex].label, index: stageIndex };
}

function SummaryDialog({ sessionId }: { sessionId: string }) {
	const [open, setOpen] = useState(false);
	const summaryQuery = useGetApiSessionsIdSummary(sessionId, {
		query: { enabled: open },
	});

	const summary = summaryQuery.data?.status === 200 ? summaryQuery.data.data : null;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					要約を見る
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[80dvh] sm:max-w-md">
				<DialogHeader>
					<DialogTitle>これまでの要約</DialogTitle>
				</DialogHeader>
				<ScrollArea className="max-h-[60dvh]">
					{summaryQuery.isLoading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
					{summaryQuery.isError && (
						<p className="text-sm text-destructive">要約の取得に失敗しました。</p>
					)}
					{summary && (
						<div className="flex flex-col gap-4 pr-4">
							<div>
								<h4 className="mb-2 text-sm font-medium">確認済みの項目</h4>
								{summary.knownPoints.length > 0 ? (
									<ul className="flex flex-col gap-1">
										{summary.knownPoints.map((point) => (
											<li key={point} className="text-sm text-muted-foreground">
												- {point}
											</li>
										))}
									</ul>
								) : (
									<p className="text-sm text-muted-foreground">まだ確認済みの項目はありません。</p>
								)}
							</div>
							<div>
								<h4 className="mb-2 text-sm font-medium">残りの確認項目</h4>
								{summary.remainingPoints.length > 0 ? (
									<ul className="flex flex-col gap-1">
										{summary.remainingPoints.map((point) => (
											<li key={point} className="text-sm text-muted-foreground">
												- {point}
											</li>
										))}
									</ul>
								) : (
									<p className="text-sm text-muted-foreground">全ての項目が確認済みです。</p>
								)}
							</div>
						</div>
					)}
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}

function TranscriptDialog({ messages }: { messages: TranscriptEntry[] }) {
	const [open, setOpen] = useState(false);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					会話ログを見る
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[80dvh] sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>会話ログ</DialogTitle>
				</DialogHeader>
				<ScrollArea className="max-h-[60dvh]">
					<div className="flex flex-col gap-3 pr-4">
						{messages.map((msg) => (
							<div
								key={msg.id}
								className={`rounded-lg p-3 text-sm ${
									msg.speaker === "ai" ? "bg-muted/50" : "bg-primary/5 ml-4"
								}`}
							>
								<p className="mb-1 text-xs font-medium text-muted-foreground">
									{msg.speaker === "ai" ? "AI" : "あなた"}
								</p>
								<p className="whitespace-pre-wrap">{msg.content}</p>
							</div>
						))}
					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}

export default function InterviewPage() {
	const { sessionId } = useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [input, setInput] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const sid = sessionId ?? "";

	const sessionQuery = useGetApiSessionsId(sid, {
		query: { enabled: !!sessionId },
	});

	const messagesQuery = useGetApiSessionsIdMessages(sid, {
		query: { enabled: !!sessionId },
	});

	const sendMutation = usePostApiSessionsIdMessages({
		mutation: {
			onSuccess: (result) => {
				queryClient.invalidateQueries({
					queryKey: getGetApiSessionsIdMessagesQueryKey(sid),
				});
				queryClient.invalidateQueries({
					queryKey: getGetApiSessionsIdQueryKey(sid),
				});
				if (result.status === 200 && result.data.shouldEnd) {
					navigate(`/complete/${sessionId}`);
				}
			},
		},
	});

	const handleSend = useCallback(() => {
		const trimmed = input.trim();
		if (!trimmed || sendMutation.isPending) return;
		setInput("");
		sendMutation.mutate({ id: sid, data: { content: trimmed } });
	}, [input, sendMutation, sid]);

	const handleSkip = useCallback(() => {
		if (sendMutation.isPending) return;
		setInput("");
		sendMutation.mutate({ id: sid, data: { content: "パス" } });
	}, [sendMutation, sid]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSend();
			}
		},
		[handleSend],
	);

	useEffect(() => {
		if (!sendMutation.isPending) {
			textareaRef.current?.focus();
		}
	}, [sendMutation.isPending]);

	const messages =
		messagesQuery.data?.status === 200 ? (messagesQuery.data.data as TranscriptEntry[]) : [];
	const latestAiMessage = [...messages].reverse().find((m) => m.speaker === "ai");
	const session = sessionQuery.data?.status === 200 ? sessionQuery.data.data : null;
	const completionScore = session?.completionScore ?? 0;
	const stageInfo = getStageInfo(completionScore);

	if (sessionQuery.isLoading || messagesQuery.isLoading) {
		return (
			<div className="flex h-dvh items-center justify-center">
				<p className="text-muted-foreground">読み込み中...</p>
			</div>
		);
	}

	if (sessionQuery.isError || messagesQuery.isError) {
		return (
			<div className="flex h-dvh items-center justify-center p-4">
				<div className="text-center">
					<p className="mb-2 text-lg font-medium">エラーが発生しました</p>
					<p className="text-sm text-muted-foreground">セッション情報の取得に失敗しました。</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-dvh flex-col bg-muted/20">
			{/* Header */}
			<div className="border-b bg-background px-4 py-3">
				<div className="mx-auto max-w-2xl">
					<div className="mb-2 flex items-center justify-between">
						<h1 className="text-sm font-medium text-muted-foreground">AIインタビュー</h1>
						<Badge variant="secondary">{stageInfo.label}</Badge>
					</div>
					{/* Progress bar */}
					<div className="flex items-center gap-1">
						{STAGES.map((stage, i) => (
							<div key={stage.label} className="flex flex-1 flex-col items-center gap-1">
								<div
									className={`h-1.5 w-full rounded-full ${
										i <= stageInfo.index ? "bg-primary" : "bg-muted"
									}`}
								/>
								<span
									className={`text-[10px] leading-tight ${
										i === stageInfo.index ? "font-medium text-primary" : "text-muted-foreground"
									}`}
								>
									{stage.label}
								</span>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Main question area */}
			<div className="flex flex-1 items-center justify-center overflow-auto p-4">
				<div className="mx-auto w-full max-w-2xl text-center">
					{sendMutation.isPending ? (
						<div className="flex flex-col items-center gap-3">
							<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
							<p className="text-sm text-muted-foreground">送信中...</p>
						</div>
					) : latestAiMessage ? (
						<p className="text-lg leading-relaxed whitespace-pre-wrap">{latestAiMessage.content}</p>
					) : (
						<p className="text-muted-foreground">メッセージを読み込んでいます...</p>
					)}
				</div>
			</div>

			{/* Bottom controls */}
			<div className="border-t bg-background px-4 py-3">
				<div className="mx-auto max-w-2xl">
					<div className="mb-3 flex gap-2">
						<SummaryDialog sessionId={sid} />
						<TranscriptDialog messages={messages} />
					</div>
					<div className="flex gap-2">
						<Textarea
							ref={textareaRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="回答を入力してください（Shift+Enterで改行）"
							disabled={sendMutation.isPending}
							className="min-h-10 max-h-32 resize-none"
							rows={1}
						/>
						<div className="flex shrink-0 flex-col gap-1 self-end">
							<Button onClick={handleSend} disabled={!input.trim() || sendMutation.isPending}>
								送信
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={handleSkip}
								disabled={sendMutation.isPending}
								className="text-xs text-muted-foreground"
							>
								スキップ
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
