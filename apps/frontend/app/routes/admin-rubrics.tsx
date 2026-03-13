import { useState } from "react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
	useDeleteApiAdminExemplarsId,
	useGetApiAdminExemplars,
	useGetApiAdminRubrics,
	useGetApiSurveysId,
	usePatchApiSurveysIdDetailThreshold,
	usePostApiAdminExemplars,
	usePostApiAdminRubricsGenerate,
	usePostApiAdminRubricsIdActivate,
} from "../../src/api/gen/aIInterviewAPI";
import type { DetailRubric } from "../../src/api/models";

const DETAIL_SCORABLE_SLOTS = [
	{ key: "why_it_felt_believable", label: "信じた理由" },
	{ key: "warning_signs_noticed", label: "違和感を覚えた点" },
	{ key: "emotions_during", label: "体験中の気持ち" },
	{ key: "emotions_after", label: "その後の気持ち" },
	{ key: "non_monetary_harm", label: "お金以外の影響" },
	{ key: "what_platform_design_might_have_helped", label: "あれば助かった仕組み" },
	{ key: "what_public_warning_might_have_helped", label: "事前の注意喚起" },
	{ key: "what_information_or_support_might_have_helped", label: "あれば助かった情報" },
] as const;

// TODO: make this dynamic once multi-survey is supported
const DEFAULT_SURVEY_ID = "default";

function RubricDisplay({ rubric }: { rubric: DetailRubric }) {
	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2 text-sm">
				<Badge variant={rubric.status === "active" ? "default" : "secondary"}>
					{rubric.status}
				</Badge>
				<span className="text-muted-foreground">
					生成日: {new Date(rubric.createdAt).toLocaleString("ja-JP")}
				</span>
				{rubric.activatedAt && (
					<span className="text-muted-foreground">
						承認日: {new Date(rubric.activatedAt).toLocaleString("ja-JP")}
					</span>
				)}
				<span className="text-muted-foreground">
					生成元: {rubric.generatedFrom.length}件のピックアップ
				</span>
			</div>
			<div className="space-y-2">
				{rubric.criteria.dimensions.map((dim) => (
					<div key={dim.name} className="rounded-lg border p-3">
						<div className="mb-1 flex items-center gap-2">
							<span className="font-medium">{dim.name}</span>
							<span className="text-muted-foreground text-xs">
								({Math.round(dim.weight * 100)}%)
							</span>
						</div>
						<p className="mb-2 text-xs text-muted-foreground">{dim.description}</p>
						<div className="space-y-1 text-xs">
							{Object.entries(dim.levels).map(([score, desc]) => (
								<div key={score} className="flex gap-2">
									<span className="w-8 shrink-0 font-mono">{score}</span>
									<span>{desc}</span>
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export default function AdminRubricsPage() {
	const [selectedSlot, setSelectedSlot] = useState(DETAIL_SCORABLE_SLOTS[0].key);
	const [surveyId] = useState(DEFAULT_SURVEY_ID);

	const exemplarsQuery = useGetApiAdminExemplars(
		{ surveyId, slotKey: selectedSlot },
		{ query: { enabled: !!surveyId } },
	);

	const rubricsQuery = useGetApiAdminRubrics(
		{ surveyId, slotKey: selectedSlot },
		{ query: { enabled: !!surveyId } },
	);

	const surveyQuery = useGetApiSurveysId(surveyId, {
		query: { enabled: !!surveyId },
	});

	const generateMutation = usePostApiAdminRubricsGenerate();
	const activateMutation = usePostApiAdminRubricsIdActivate();
	const deleteExemplarMutation = useDeleteApiAdminExemplarsId();
	const thresholdMutation = usePatchApiSurveysIdDetailThreshold();
	const createExemplarMutation = usePostApiAdminExemplars();

	const exemplars = exemplarsQuery.data?.status === 200 ? exemplarsQuery.data.data : [];
	const rubrics = rubricsQuery.data?.status === 200 ? rubricsQuery.data.data : [];
	const surveyData = surveyQuery.data?.status === 200 ? surveyQuery.data.data : null;

	const [thresholdInput, setThresholdInput] = useState<string>("");
	const [sampleText, setSampleText] = useState<string>("");
	const currentThreshold = surveyData?.detailThreshold ?? 0.6;

	const activeRubric = rubrics.find((r) => r.status === "active");
	const draftRubric = rubrics.find((r) => r.status === "draft");

	const handleThresholdSave = () => {
		const value = Number.parseFloat(thresholdInput || String(currentThreshold));
		if (Number.isNaN(value) || value < 0 || value > 1) return;
		thresholdMutation.mutate(
			{ id: surveyId, data: { detailThreshold: value } },
			{
				onSuccess: () => {
					surveyQuery.refetch();
					setThresholdInput("");
				},
			},
		);
	};

	const handleGenerate = () => {
		generateMutation.mutate(
			{ data: { surveyId, slotKey: selectedSlot } },
			{
				onSuccess: () => rubricsQuery.refetch(),
			},
		);
	};

	const handleActivate = (rubricId: string) => {
		activateMutation.mutate(
			{ id: rubricId },
			{
				onSuccess: () => rubricsQuery.refetch(),
			},
		);
	};

	const handleDeleteExemplar = (exemplarId: string) => {
		deleteExemplarMutation.mutate(
			{ id: exemplarId },
			{
				onSuccess: () => exemplarsQuery.refetch(),
			},
		);
	};

	return (
		<div className="mx-auto min-h-dvh max-w-4xl p-4">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">ルーブリック管理</h1>
				<Button asChild variant="outline" size="sm">
					<Link to="/admin">一覧に戻る</Link>
				</Button>
			</div>

			{/* Slot selector */}
			<div className="mb-6">
				<label htmlFor="slot-select" className="mb-2 block text-sm font-medium">
					スロット選択
				</label>
				<select
					id="slot-select"
					className="rounded-md border bg-background px-3 py-2 text-sm"
					value={selectedSlot}
					onChange={(e) => setSelectedSlot(e.target.value)}
				>
					{DETAIL_SCORABLE_SLOTS.map((slot) => (
						<option key={slot.key} value={slot.key}>
							{slot.label}（{slot.key}）
						</option>
					))}
				</select>
			</div>

			{/* Threshold setting */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="text-lg">詳細度閾値設定</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="mb-3 text-sm text-muted-foreground">
						深掘りを行う詳細度スコアの閾値（0.0〜1.0）。この値を下回るスロットは深掘り対象になります。
					</p>
					<div className="flex items-center gap-3">
						<span className="text-sm">
							現在の閾値: <strong>{currentThreshold}</strong>
						</span>
						<Input
							type="number"
							min={0}
							max={1}
							step={0.05}
							placeholder={String(currentThreshold)}
							value={thresholdInput}
							onChange={(e) => setThresholdInput(e.target.value)}
							className="w-28"
						/>
						<Button
							size="sm"
							onClick={handleThresholdSave}
							disabled={thresholdMutation.isPending || !thresholdInput}
						>
							{thresholdMutation.isPending ? "保存中..." : "保存"}
						</Button>
					</div>
				</CardContent>
			</Card>

			<div className="flex flex-col gap-6">
				{/* Exemplars section */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">
							ピックアップ済みの良い回答（{exemplars.length}件）
						</CardTitle>
					</CardHeader>
					<CardContent>
						{exemplarsQuery.isLoading && (
							<p className="text-sm text-muted-foreground">読み込み中...</p>
						)}
						{exemplars.length === 0 && !exemplarsQuery.isLoading && (
							<p className="mb-4 text-sm text-muted-foreground">
								まだピックアップされた回答はありません。下のフォームから初期サンプルを登録するか、セッション詳細ページからピックアップしてください。
							</p>
						)}
						{exemplars.length > 0 && (
							<div className="space-y-4">
								{exemplars.map((exemplar, i) => (
									<div key={exemplar.id} className="rounded-lg border p-3">
										<div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
											<span>
												{i + 1}.{" "}
												{exemplar.sessionId
													? `Session ${exemplar.sessionId.slice(0, 8)}...`
													: "初期サンプル"}
												（{new Date(exemplar.createdAt).toLocaleDateString("ja-JP")}）
											</span>
											<Button
												variant="ghost"
												size="sm"
												className="h-6 px-2 text-xs"
												onClick={() => handleDeleteExemplar(exemplar.id)}
												disabled={deleteExemplarMutation.isPending}
											>
												削除
											</Button>
										</div>
										<p className="mb-1 text-sm">「{exemplar.rawText}」</p>
										{exemplar.notes && (
											<p className="text-xs text-muted-foreground">メモ: {exemplar.notes}</p>
										)}
									</div>
								))}
							</div>
						)}
						{/* Initial sample registration */}
						<div className="mt-4 rounded-lg border p-3">
							<h4 className="mb-2 text-sm font-medium">初期サンプルを登録</h4>
							<Textarea
								value={sampleText}
								onChange={(e) => setSampleText(e.target.value)}
								placeholder="良い回答の例文を入力してください（例: 「LINEグループに有名な投資家の写真があって、他の人も毎日利益を報告していたので信頼してしまいました」）"
								rows={3}
							/>
							<Button
								variant="outline"
								size="sm"
								className="mt-2"
								disabled={!sampleText.trim() || createExemplarMutation.isPending}
								onClick={() => {
									createExemplarMutation.mutate(
										{
											data: {
												surveyId,
												slotKey: selectedSlot,
												rawText: sampleText.trim(),
												extractedValue: [],
												notes: "初期サンプル（リサーチャー登録）",
											},
										},
										{
											onSuccess: () => {
												setSampleText("");
												exemplarsQuery.refetch();
											},
										},
									);
								}}
							>
								{createExemplarMutation.isPending ? "登録中..." : "サンプルを登録"}
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Rubric section */}
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="text-lg">ルーブリック</CardTitle>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={handleGenerate}
									disabled={exemplars.length < 3 || generateMutation.isPending}
								>
									{generateMutation.isPending ? "生成中..." : "ルーブリックを生成"}
								</Button>
								{draftRubric && (
									<Button
										size="sm"
										onClick={() => handleActivate(draftRubric.id)}
										disabled={activateMutation.isPending}
									>
										{activateMutation.isPending ? "承認中..." : "ルーブリックを承認"}
									</Button>
								)}
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{exemplars.length < 3 && (
							<p className="text-sm text-muted-foreground">
								ルーブリック生成には3件以上のピックアップが必要です。
							</p>
						)}

						{generateMutation.isError && (
							<p className="mb-4 text-sm text-destructive">
								ルーブリック生成に失敗しました。もう一度お試しください。
							</p>
						)}

						{rubricsQuery.isLoading && (
							<p className="text-sm text-muted-foreground">読み込み中...</p>
						)}

						{/* Draft rubric */}
						{draftRubric && (
							<div className="mb-6">
								<h3 className="mb-2 text-sm font-medium">生成済み（未承認）</h3>
								<RubricDisplay rubric={draftRubric} />
							</div>
						)}

						{/* Active rubric */}
						{activeRubric && (
							<div>
								<h3 className="mb-2 text-sm font-medium">現在有効なルーブリック</h3>
								<RubricDisplay rubric={activeRubric} />
							</div>
						)}

						{!draftRubric && !activeRubric && exemplars.length >= 3 && !rubricsQuery.isLoading && (
							<p className="text-sm text-muted-foreground">
								ルーブリックはまだ生成されていません。「ルーブリックを生成」ボタンを押してください。
							</p>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
