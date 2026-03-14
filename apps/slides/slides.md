---
theme: default
title: AI Interview Platform
info: |
  AI Interview platform for collecting structured testimony data
  through conversational AI interviews.
class: text-center
drawings:
  persist: false
transition: slide-left
mdc: true
---

# AI Interview Platform

対話型AIインタビューによる構造化証言データ収集

<div class="abs-bl m-6 text-left text-sm opacity-60">
ネット広告詐欺被害の体験収集 — 市民調査・政策立案・メディアリテラシー研究のために
</div>

---
layout: section
---

# 1. プロジェクト概要

---

## なぜこのシステムをつくるのか

<div class="grid grid-cols-2 gap-8 mt-8">
<div>

### 背景

- ネット広告詐欺の被害は増加傾向
- 被害体験は個人の記憶に留まり、構造化されていない
- 政策立案に必要な**定性データ**が不足している

</div>
<div>

### 目的

- AIインタビューで被害体験を**構造化データ**として収集
- 市民調査・政策立案・メディアリテラシー研究に活用
- 通報ツールではない — **あくまで研究用**

</div>
</div>

<div class="mt-8 p-4 bg-blue-50 rounded-lg text-sm">

**初期ユースケース**: オンライン広告詐欺体験の収集（テーマ拡張可能な設計）

</div>

---

## システムの特徴

<div class="grid grid-cols-3 gap-6 mt-8">
<div class="p-4 bg-blue-50 rounded-lg">

### 🤖 AI駆動

LLMが会話から情報を抽出し、適切な質問を生成

</div>
<div class="p-4 bg-green-50 rounded-lg">

### 🛡️ 安全第一

心理的負担を常時モニタリング、危険時は即停止

</div>
<div class="p-4 bg-purple-50 rounded-lg">

### 📊 構造化出力

自由な会話から9カテゴリの構造化データを自動生成

</div>
</div>

<div class="grid grid-cols-3 gap-6 mt-4">
<div class="p-4 bg-amber-50 rounded-lg">

### 🔒 プライバシー保護

PII自動検出・リダクション、禁止データは保存しない

</div>
<div class="p-4 bg-red-50 rounded-lg">

### ⚖️ LLM + ルール

主観判断はLLM、制御ロジックはルールベースで説明可能

</div>
<div class="p-4 bg-gray-50 rounded-lg">

### 📈 詳細度スコアリング

動的ルーブリックで回答品質を0.0〜1.0で評価、自動深掘り

</div>
</div>

---
layout: section
---

# 2. ユーザー体験

---

## インタビュー画面

<div class="flex justify-center mt-4">
<img src="/images/user-experience.svg" class="h-96" />
</div>

---

## 参加者の体験フロー

<div class="mt-6">

| ステップ | 体験内容 |
|---------|---------|
| **1. 開始** | アンケートURLにアクセス、説明を読んで同意 |
| **2. 自由語り** | 「何があったか、自由にお聞かせください」 |
| **3. 深掘り質問** | AIが未収集の情報を1つずつ質問（スキップ可） |
| **4. 確認ゲート** | 心理面の質問前に「続けますか？」と確認 |
| **5. 要約確認** | いつでも「要約を見る」で収集済み情報を確認可能 |
| **6. 完了** | 感謝メッセージ |

</div>

<div class="mt-4 p-3 bg-amber-50 rounded-lg text-sm">

**安全停止**: 参加者が辛そうなとき、やめたいと言ったとき → 即座にインタビュー終了 + リソース案内

</div>

---

## 画面の主な機能

<div class="grid grid-cols-2 gap-8 mt-6">
<div>

### メイン画面

- **大きなAI質問テキスト** — 現在の質問を明確に表示
- **テキスト入力** — 自由記述で回答
- **スキップボタン** — 答えたくない質問はスキップ可能
- **送信ボタン** — 回答を送信

</div>
<div>

### 補助機能

- **5段階プログレスバー**
  - 概要理解 → 基本情報 → 詳細確認 → 背景確認 → 完了
- **要約モーダル**
  - 確認済み項目 + 残りの確認項目（最大3つ）
- **会話ログモーダル**
  - 全発言を時系列で確認

</div>
</div>

---
layout: section
---

# 3. 管理者機能

---

## 管理者ができること

<div class="grid grid-cols-2 gap-8 mt-8">
<div>

### セッション一覧・詳細

- 全セッションの一覧表示（ステータス・完了率）
- **スロット別カードUI** — 各スロットの抽出値・詳細度スコア・ピックアップ状態を表示
- 良い回答の「ピックアップ」ボタンでルーブリック生成の素材を収集

</div>
<div>

### ルーブリック管理（`/admin/rubrics`）

- スロット別にピックアップ済みの良い回答を一覧管理
- **ルーブリック生成** — Claude Sonnetが良い回答群から評価基準を自動生成
- リサーチャーが確認・**承認**して運用開始
- 詳細度閾値（深掘り基準）の設定

</div>
</div>

---
layout: section
---

# 4. インタビュー手法

---

## ステージフロー

<div class="flex justify-center mt-4">
<img src="/images/stage-flow.svg" class="w-full max-w-4xl" />
</div>

---

## 各ステージの役割

<div class="mt-2">

| ステージ | 役割 | 収集する情報 |
|---------|------|------------|
| **intro** | 導入・同意取得 | 同意確認 |
| **clarify_entry_point** | 接触経緯の深掘り | チャネル、広告有無、プラットフォーム |
| **clarify_flow** | やりとりの深掘り | 外部誘導、要求内容（送金、個人情報等） |
| **clarify_harm** | 被害状況の確認 | 金銭被害額、非金銭被害 |
| **clarify_psychology** | 心理面の確認 | 信じた理由、警告サイン、感情 |
| **clarify_prevention** | 予防策の聴取 | プラットフォーム改善提案、必要な情報 |
| **wrap_up** | 終了 | 感謝 + リソース案内 |
| **stop** | 安全停止 | （即座に終了、リソース案内） |

</div>

---

## スロット駆動型の質問生成

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

### 仕組み

- 自由対話ではなく**未充填スロットの優先キュー**で次の質問を決定
- 全17スロットに優先順位あり
- 「覚えていない」「答えたくない」→ 自動スキップ
- 深掘りフェーズ前に**確認ゲート**
- **2パス方式**: 未充填スロット → 詳細度が閾値未満のスロットを深掘り

</div>
<div>

### スロット優先順位（上位）

1. `first_touch_channel` — 最初の接触チャネル
2. `case_type` — 被害 / 未遂 / 家族 / 不明
3. `was_ad` — 広告だったか
4. `ad_platform` — 広告プラットフォーム
5. `claimed_role` — 相手の名乗った役割
6. `moved_to_external_channel` — 外部誘導
7. `money_sent` — 送金したか
8. `estimated_amount_jpy` — 被害概算額
9. `why_it_felt_believable` — 信じた理由
10. ... 以降、感情・予防策系

</div>
</div>

---

## 確認ゲートと深掘りフェーズ

<div class="mt-6">

基本情報の収集が終わると、心理面・予防策の質問に入る前に**参加者に確認**を取る

</div>

<div class="grid grid-cols-2 gap-8 mt-6">
<div class="p-4 bg-blue-50 rounded-lg">

### 確認メッセージ例

<div class="text-sm">

> ここまでお話しいただきありがとうございます。もしよろしければ、**体験中の気持ち、その後の気持ち、お金以外の影響**についてもお聞きしたいのですが、続けても大丈夫ですか？
> ここで終わりにしても全く問題ありません。

</div>

</div>
<div class="p-4 bg-gray-50 rounded-lg">

### 深掘りスロット（確認後）

- `emotions_during` — 当時の感情
- `emotions_after` — その後の感情
- `non_monetary_harm` — 非金銭的被害
- `what_platform_design_might_have_helped`
- `what_public_warning_might_have_helped`
- `what_information_or_support_might_have_helped`
- `what_should_be_improved_first`

</div>
</div>

<div class="mt-4 text-sm opacity-70">

「終わります」「結構です」などの終了意図を検出 → wrap_up へ遷移

</div>

---
layout: section
---

# 5. アルゴリズム詳細

---

## ターン処理パイプライン（processTurn）

<div class="flex justify-center">
<img src="/images/pipeline.svg" class="h-110" />
</div>

---

## LLMとルールベースの役割分担

<div class="flex justify-center mt-4">
<img src="/images/llm-vs-rule.svg" class="w-full max-w-4xl" />
</div>

<div class="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-center">

**設計方針**: 主観的判断が必要なタスクはLLMに、制御ロジックはルールベースで実装し**説明可能性**を確保

</div>

---

## 完了スコアの重み付け

<div class="grid grid-cols-3 gap-6 mt-4">
<div class="p-4 border-2 border-red-400 rounded-lg">

### 必須（50%）
各 10%

- `case_type`
- `first_touch_channel`
- `was_ad`
- `money_sent`
- `why_it_felt_believable` *

</div>
<div class="p-4 border-2 border-amber-400 rounded-lg">

### 準必須（30%）
各 5%

- `ad_platform`
- `claimed_role`
- `moved_to_external_channel`
- `warning_signs_noticed` *
- `emotions_during` *
- `emotions_after` *

</div>
<div class="p-4 border-2 border-blue-400 rounded-lg">

### あると良い（15%）
各 2.5%

- `estimated_amount_jpy`
- `non_monetary_harm` *
- `platform_design_help` *
- `public_warning_help` *
- `info_support_help` *
- `should_be_improved_first`

</div>
</div>

<div class="mt-3 p-2 bg-purple-50 rounded-lg text-xs">

**\* 詳細度スコアリング対象**: バイナリではなく `weight × detail_score(0.0〜1.0)` で算出

</div>

<div class="mt-2 text-sm">

| スコア帯 | 判定 | 意味 |
|---------|------|------|
| 0.0–0.4 | 不十分 | 追加質問が必要 |
| 0.4–0.7 | 追加質問要 | 深掘り不足 |
| 0.7–0.85 | 分析可能 | 研究データとして利用可 |
| 0.85+ | 高品質 | 十分な情報が収集済み |

</div>

---

## 安全性システム

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

### LLM安全性分類

- **burden_level** (0–3): 心理的負担
- **risk_level**: none / low / medium / high
- **stop_intent**: やめたい意思の検出
- **pii_detected / secret_detected**: 個人情報検出

### 停止条件（ルールベース）

```
shouldStop =
  burden_level >= 3
  || risk_level == "high"
  || stop_intent == true
```

<div class="text-xs opacity-70">

※ `secret_detected` は停止トリガーではなくPIIリダクションで処理

</div>

</div>
<div>

### 禁止データ検出（正規表現）

<div class="text-sm">

| カテゴリ | パターン |
|---------|---------|
| パスワード | パスワード + テキスト |
| OTP | 認証コード + 4-8桁 |
| 口座番号 | 口座番号 + 6-8桁 |
| カード番号 | 16桁カード形式 |
| 秘密鍵 | private key, seed phrase |
| 住所 | 3区画以上の日本住所 |
| 電話番号 | 0X-XXXX-XXXX形式 |
| メール | email正規表現 |

</div>

### PIIリダクション

DB保存前に自動置換: `メール → [REDACTED:email]` 等

</div>
</div>

---
layout: section
---

# 6. 回答詳細度スコアリング

---

## 課題と解決アプローチ

<div class="grid grid-cols-2 gap-8 mt-6">
<div>

### 課題

従来の完了スコアは各スロットの**有無（バイナリ）**で算出

- 「Instagram」と一言だけの回答も、具体的な経緯を3文で説明した回答も同じ「完了」扱い
- 回答者間で情報の詳細度にばらつき
- リサーチャーが求める深さに達していなくても深掘りが終了

</div>
<div>

### 解決

**動的ルーブリック生成**による回答品質の均一化

- 各スロットの回答に**詳細度（0.0〜1.0）**を判定
- リサーチャーが「良い回答」をピックアップ → **評価基準を自動生成**
- 閾値未満のスロットは**自動で深掘り質問**を追加

</div>
</div>

---

## 全体フロー

<div class="mt-4">

```
Phase 1: 初期運用（ルーブリックなし）
  → バイナリ判定にフォールバック（detail_score = 1.0）

Phase 2: 回答蓄積期
  リサーチャーが実際の回答から「良い回答」をピックアップ
  → ピックアップが3件以上溜まる

Phase 3: ルーブリック生成
  「ルーブリックを生成」→ Claude Sonnet がピックアップの共通点を抽出
  → リサーチャーが確認・承認

Phase 4: ルーブリック運用
  承認されたルーブリックで Claude Haiku がリアルタイム詳細度判定
  → 閾値未満のスロットは自動深掘り
```

</div>

---

## 詳細度判定の対象（8スロット）

<div class="grid grid-cols-2 gap-8 mt-6">
<div>

### 詳細度判定対象

自由記述的な回答を持つスロット

| スロット | 判定理由 |
|---------|---------|
| `why_it_felt_believable` | 信じた理由の具体性 |
| `warning_signs_noticed` | 違和感の具体性 |
| `emotions_during` | 体験中の感情の深さ |
| `emotions_after` | 事後の感情の深さ |
| `non_monetary_harm` | 非金銭的被害の具体性 |
| `what_platform_design_...` | 予防策提案の具体性 |
| `what_public_warning_...` | 注意喚起提案の具体性 |
| `what_information_...` | 情報支援提案の具体性 |

</div>
<div>

### バイナリ判定のまま（9スロット）

boolean / enum / number のスロット

- `case_type` — enum
- `first_touch_channel` — 単一事実
- `was_ad` — Yes/No
- `ad_platform` — 単一事実
- `claimed_role` — enum的
- `moved_to_external_channel` — Yes/No
- `money_sent` — Yes/No
- `attempt_stopped_before_payment` — Yes/No
- `estimated_amount_jpy` — 数値

</div>
</div>

---

## ルーブリックの構造

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

### 構造（JSON）

```json
{
  "slot_key": "why_it_felt_believable",
  "version": 1,
  "dimensions": [
    {
      "name": "具体性",
      "weight": 0.3,
      "levels": {
        "0.0": "言及なし",
        "0.3": "抽象的な言及のみ",
        "0.6": "一定の具体性あり",
        "1.0": "高い具体性"
      }
    },
    { "name": "多面性", "weight": 0.3, ... },
    { "name": "心理過程", "weight": 0.2, ... },
    { "name": "時間軸", "weight": 0.2, ... }
  ]
}
```

</div>
<div>

### スコア算出

```
detail_score = Σ (dim.weight × dim.level_score)
```

**例**: 具体性=0.6, 多面性=0.3, 心理過程=0.5, 時間軸=0.0

```
= 0.3×0.6 + 0.3×0.3 + 0.2×0.5 + 0.2×0.0
= 0.37
```

### 深掘り判定

```
detail_score >= threshold → 次のスロットへ
detail_score <  threshold → 深掘り質問を追加
```

閾値はリサーチャーが管理画面で調整可能（デフォルト: 0.6）

### スコア安定化

ターン間のブレ防止: **monotonic increase**（直近の最大値を採用）

</div>
</div>

---

## LLMモデルの使い分け

<div class="grid grid-cols-2 gap-8 mt-8">
<div class="p-4 bg-blue-50 rounded-lg">

### Claude Sonnet — 高精度タスク

- **抽出**: 発話からスキーマに沿った構造化データを抽出
- **ルーブリック生成**: ピックアップされた良い回答群の共通点を分析
- **要約**: 収集済み情報の中間要約を生成
- **事後バリデーション**: 抽出結果の整合性検証

</div>
<div class="p-4 bg-green-50 rounded-lg">

### Claude Haiku — 低レイテンシタスク

- **安全性分類**: 心理的負担・停止意思をリアルタイム判定
- **質問生成**: 次のスロットに応じた質問文を生成
- **詳細度判定**: ルーブリックに沿ったスコアリング（バックグラウンド実行）
- 低コスト・高速レスポンス重視

</div>
</div>

<div class="mt-6">

### 改修後のパイプライン

```
ユーザー発言 → PIIリダクション → 抽出(Sonnet) + 安全判定(Haiku) [並列]
  → 禁止データチェック → マージ → 停止判定
  → 完了スコア算出（詳細度加味） → ステージ判定
  → スロット選択（2パス: 未充填 → 低スコア深掘り）
  → 確認ゲート判定 → 質問生成(Haiku)
  → DB保存 → 詳細度判定(Haiku, バックグラウンド)
```

</div>

---
layout: section
---

# 7. 分析対象データ

---

## CaseRecord の構造

<div class="flex justify-center mt-2">
<img src="/images/case-record.svg" class="w-full max-w-4xl" />
</div>

---

## 各セクションの詳細と設計意図

<div class="mt-2 text-sm">

| セクション | 内容 | 設計意図 |
|-----------|------|---------|
| **entry_point** | チャネル、広告有無、PF | **どこで**接触 — 広告規制の根拠 |
| **actor_profile** | 役割、信頼シグナル | **誰に**騙された — 手口の類型化 |
| **interaction_flow** | 外部誘導、要求内容 | **何が起きた** — 誘導パターン |
| **harm_outcome** | 金銭・非金銭被害 | **被害の実態** — 規模の定量化 |
| **psychology** | 信じた理由、感情 | **なぜ騙された** — 政策設計の核心 |
| **evidence** | スクショ、チャットログ等 | 証拠保全状況の把握 |
| **prevention_signal** | 改善提案、必要な支援 | **何があれば防げた** — 市民の声 |
| **safety_meta** | PII検出、負担レベル | 安全性フラグ |
| **quality_meta** | 完了スコア、欠落フィールド | 分析時フィルタリング基準 |

</div>

---

## データの政策活用イメージ

<div class="grid grid-cols-2 gap-8 mt-6">
<div>

### 5W1Hの網羅

```
WHERE  → entry_point（どこで接触）
WHO    → actor_profile（誰に騙された）
WHAT   → interaction_flow（何が起きた）
HOW    → harm_outcome（どんな被害）
WHY    → psychology（なぜ騙された）
FUTURE → prevention_signal（何があれば防げた）
```

</div>
<div>

### 活用例

- **広告プラットフォーム規制**: entry_point + actor_profile から広告審査改善を提案
- **被害パターン分析**: interaction_flow のクラスタリングで手口を類型化
- **心理的要因の研究**: psychology データから脆弱性要因を分析
- **政策提言**: prevention_signal を直接的な市民の声として活用

</div>
</div>

---

## 主な列挙値（Enum）

<div class="grid grid-cols-2 gap-6 mt-4 text-xs">
<div>

### case_type
`victim` `near_miss` `family` `unclear`

### ad_claim_type
`investment_return` `celebrity_endorsement` `romance` `job_offer` `side_income` `authority_like` `health_claim` `other`

### claimed_role
`investor` `financial_expert` `celebrity` `government_official` `support_staff` `romantic_interest` `recruiter` `friend_like_person` `other`

### trust_signal
`famous_person_image` `verified_like_appearance` `professional_website` `many_followers` `success_story` `friend_like_conversation` `urgent_language` `social_proof` `deepfake_like_media` `other`

</div>
<div>

### warning_signs_noticed
`too_good_to_be_true` `moved_off_platform` `asked_for_money` `asked_for_id` `asked_for_app_install` `pressure_to_act_fast` `unclear_company_identity` `broken_japanese` `other`

### non_monetary_harm
`fear` `shame` `time_loss` `relationship_damage` `identity_document_exposure` `account_compromise` `mental_distress` `other`

### emotions
`hope` `excitement` `anxiety` `confusion` `regret` `shame` `anger` `relief` `fear` `distrust`

### prevention_signal
`clearer_ad_warning` `faster_suspicious_ad_removal` `better_identity_verification` `easier_scam_information_access` `better_media_literacy_guidance` `platform_design_change` `other`

</div>
</div>

---
layout: section
---

# 8. システム構成

---

## 全体アーキテクチャ

<div class="flex justify-center mt-4">
<img src="/images/architecture.svg" class="w-full max-w-4xl" />
</div>

---

## フロントエンド

<div class="grid grid-cols-2 gap-8 mt-6">
<div>

### 技術スタック

| 技術 | 用途 |
|------|------|
| **React Router v7** | ファイルベースルーティング |
| **TanStack Query** | API通信・キャッシュ管理 |
| **Tailwind CSS v4** | スタイリング |
| **shadcn/ui** | UIコンポーネント |
| **Orval** | OpenAPIからAPIクライアント自動生成 |

</div>
<div>

### 主要ページ

| パス | 内容 |
|------|------|
| `/survey/{surveyId}` | 調査説明・同意取得 |
| `/interview/{id}` | インタビュー画面 |
| `/complete/{id}` | 完了画面 |
| `/admin` | 管理者：セッション一覧 |
| `/admin/sessions/{id}` | 管理者：詳細（スロットカード） |
| `/admin/rubrics` | ルーブリック管理 |

### 開発

```bash
pnpm dev          # :5173
pnpm generate:api # APIクライアント再生成
```

</div>
</div>

---

## バックエンド

<div class="grid grid-cols-2 gap-8 mt-6">
<div>

### 技術スタック

| 技術 | 用途 |
|------|------|
| **Cloudflare Workers** | エッジランタイム |
| **Hono (OpenAPIHono)** | APIフレームワーク + OpenAPIスキーマ |
| **Drizzle ORM** | DB操作・マイグレーション |
| **Cloudflare D1** | SQLiteベースDB |
| **Zod** | バリデーション |
| **Anthropic SDK** | Claude API呼び出し |

</div>
<div>

### APIエンドポイント

<div class="text-xs">

| メソッド | パス | 用途 |
|---------|------|------|
| POST | `/api/surveys` | アンケート作成 |
| GET | `/api/surveys/{id}` | アンケート取得 |
| PATCH | `/api/surveys/{id}/detail-threshold` | 閾値変更 |
| POST | `/api/sessions` | セッション開始 |
| GET | `/api/sessions/{id}` | セッション取得 |
| POST | `/api/sessions/{id}/messages` | メッセージ送信 |
| GET | `/api/sessions/{id}/messages` | 会話ログ |
| GET | `/api/sessions/{id}/summary` | 要約取得 |
| POST | `/api/admin/exemplars` | ピックアップ |
| POST | `/api/admin/rubrics/generate` | ルーブリック生成 |
| POST | `/api/admin/rubrics/{id}/activate` | 承認 |

</div>

</div>
</div>

---

## デプロイ環境

<div class="grid grid-cols-2 gap-8 mt-6">
<div>

### ローカル開発

```yaml
# docker-compose.yml
services:
  frontend:  # :5173
    React Router dev server
  backend:   # :8787
    Wrangler dev server
```

- Docker Composeで両サービス起動
- ホットリロード対応
- `apps/backend/.dev.vars` に環境変数

</div>
<div>

### 本番環境

- **Cloudflare Workers** でバックエンドをエッジデプロイ
- **Cloudflare D1** でSQLiteデータベース
- Wrangler CLIでデプロイ管理

### モノレポ構成

```
ai-interview/
├── apps/
│   ├── backend/   # Cloudflare Workers
│   ├── frontend/  # React Router
│   └── slides/    # このスライド
├── pnpm-workspace.yaml
└── docker-compose.yml
```

</div>
</div>

---

## 開発コマンドまとめ

<div class="mt-4">

| コマンド | 場所 | 内容 |
|---------|------|------|
| `pnpm dev` | ルート | frontend + backend 同時起動 |
| `pnpm build` | ルート | 両アプリビルド |
| `pnpm typecheck` | ルート | 型チェック |
| `pnpm biome:check` | ルート | Biome lint + format |
| `pnpm test` | backend | Vitest実行（Workers pool） |
| `pnpm db:generate` | backend | Drizzleマイグレーション生成 |
| `pnpm db:migrate:local` | backend | ローカルD1マイグレーション |
| `pnpm generate:api` | frontend | Orval APIクライアント生成 |

</div>

<div class="mt-4 p-3 bg-amber-50 rounded-lg text-sm">

**注意**: Biome（ESLint/Prettierではない）、タブインデント、ダブルクォート、行幅100文字

</div>

---
layout: center
class: text-center
---

# Let's Build Together

一緒にこのシステムをつくっていきましょう

<div class="mt-8 text-sm opacity-60">

質問・提案・フィードバックはいつでも歓迎です

</div>
