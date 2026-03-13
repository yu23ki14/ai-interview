# 回答詳細度スコアリング仕様書

## 動的ルーブリック生成による回答品質の均一化

Version: 0.1
Status: Draft

---

# 1. 背景と目的

## 1.1 現状の課題

現在の completion score は各スロットの**有無（バイナリ）**で算出している。

```
isFilled(slot) → true: weight加算 / false: 0
```

この方式では以下の問題が発生する。

- 「Instagram」と一言だけの回答も、具体的な経緯を3文で説明した回答も同じ「完了」扱い
- 回答者間で情報の詳細度にばらつきが出る
- リサーチャーが求める深さに達していなくても深掘りが終了してしまう

## 1.2 目的

- 各スロットの回答に対して**詳細度（0.0〜1.0）**を判定する
- リサーチャーが「良い回答」をピックアップすることで**動的にルーブリック（評価基準）を生成**する
- 回答の詳細度を均一化し、リサーチデータの品質を向上させる

---

# 2. 対象スロット

詳細度判定は**自由記述的なスロット**のみに適用する。boolean/enum/number のスロットはバイナリ判定のまま。

## 2.1 詳細度判定対象（8スロット）

| スロット | 現在の型 | 判定理由 |
|---|---|---|
| `why_it_felt_believable` | string[] | 信じた理由の具体性が重要 |
| `warning_signs_noticed` | string[] | 違和感の具体性が重要 |
| `emotions_during` | string[] | 体験中の感情の具体性 |
| `emotions_after` | string[] | 事後の感情の具体性 |
| `non_monetary_harm` | string[] | 非金銭的被害の具体性 |
| `what_platform_design_might_have_helped` | string[] | 予防策提案の具体性 |
| `what_public_warning_might_have_helped` | string[] | 注意喚起提案の具体性 |
| `what_information_or_support_might_have_helped` | string[] | 情報支援提案の具体性 |

## 2.2 バイナリ判定のまま（9スロット）

| スロット | 型 | 理由 |
|---|---|---|
| `case_type` | enum | 選択肢から決まる |
| `first_touch_channel` | string | 単一事実 |
| `was_ad` | boolean | Yes/No |
| `ad_platform` | string | 単一事実 |
| `claimed_role` | string[] | enum的な値の列挙 |
| `moved_to_external_channel` | boolean | Yes/No |
| `money_sent` | boolean | Yes/No |
| `attempt_stopped_before_payment` | boolean | Yes/No |
| `estimated_amount_jpy` | number | 数値 |

---

# 3. 全体フロー

```
Phase 1: 初期運用（ルーブリックなし）
  リサーチャーが初期サンプル回答を1件登録
  → サンプルとの比較で詳細度判定（LLM）

Phase 2: 回答蓄積期
  リサーチャーが実際の回答から「良い回答」をピックアップ
  → ピックアップが一定数（3件以上）溜まる

Phase 3: ルーブリック生成
  リサーチャーが「ルーブリック生成」ボタンを押す
  → LLMがピックアップされた回答群の共通点を抽出
  → ルーブリック（評価観点＋重み）を生成
  → リサーチャーが確認・承認

Phase 4: ルーブリック運用
  承認されたルーブリックで詳細度判定
  → 追加ピックアップでルーブリック再生成も可能
```

---

# 4. データモデル

## 4.1 新規テーブル

### `detail_rubrics` — ルーブリック定義

```sql
CREATE TABLE detail_rubrics (
  id TEXT PRIMARY KEY,
  survey_id TEXT NOT NULL REFERENCES surveys(id),
  slot_key TEXT NOT NULL,            -- 対象スロット名
  status TEXT NOT NULL DEFAULT 'draft', -- draft | active | archived
  criteria JSON NOT NULL,            -- ルーブリック本体（後述）
  generated_from JSON NOT NULL,      -- 生成元のピックアップIDリスト
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  activated_at TEXT,
  UNIQUE(survey_id, slot_key, status) -- 1スロットにつきactiveは1つ
);
```

### `exemplar_answers` — ピックアップされた良い回答

```sql
CREATE TABLE exemplar_answers (
  id TEXT PRIMARY KEY,
  survey_id TEXT NOT NULL REFERENCES surveys(id),
  session_id TEXT NOT NULL REFERENCES interview_sessions(id),
  slot_key TEXT NOT NULL,            -- 対象スロット名
  raw_text TEXT NOT NULL,            -- 回答者の原文（該当スロットに関する発言）
  extracted_value JSON NOT NULL,     -- 抽出された構造化値
  picked_by TEXT,                    -- ピックアップしたリサーチャー識別子
  notes TEXT,                        -- リサーチャーのメモ（任意）
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `detail_scores` — 詳細度スコア履歴

```sql
CREATE TABLE detail_scores (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES interview_sessions(id),
  slot_key TEXT NOT NULL,
  score REAL NOT NULL,               -- 0.0〜1.0
  rubric_id TEXT REFERENCES detail_rubrics(id), -- 使用したルーブリック（null=サンプル比較）
  judged_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## 4.2 既存テーブルへの変更

### `extracted_cases` に追加

```sql
ALTER TABLE extracted_cases ADD COLUMN detail_scores JSON;
-- { "why_it_felt_believable": 0.7, "warning_signs_noticed": 0.4, ... }
```

---

# 5. ルーブリックの構造

## 5.1 ルーブリック JSON スキーマ

```json
{
  "slot_key": "why_it_felt_believable",
  "version": 1,
  "dimensions": [
    {
      "name": "具体性",
      "description": "固有名詞・具体的な状況描写が含まれているか",
      "weight": 0.3,
      "levels": {
        "0.0": "言及なし",
        "0.3": "抽象的な言及のみ（例: 「信頼できそうだった」）",
        "0.6": "一定の具体性あり（例: 「有名人の写真があった」）",
        "1.0": "高い具体性（例: 「LINEグループに著名投資家Xの写真があり、毎日利益報告のスクショが投稿されていた」）"
      }
    },
    {
      "name": "多面性",
      "description": "信じた理由が複数の観点から述べられているか",
      "weight": 0.3,
      "levels": {
        "0.0": "理由の言及なし",
        "0.3": "1つの理由のみ",
        "0.6": "2つの理由",
        "1.0": "3つ以上の異なる観点からの理由"
      }
    },
    {
      "name": "心理過程",
      "description": "なぜそう感じたかの心理的な過程が述べられているか",
      "weight": 0.2,
      "levels": {
        "0.0": "心理過程の言及なし",
        "0.5": "結果のみ（例: 「信じてしまった」）",
        "1.0": "過程あり（例: 「最初は怪しいと思ったが、他の人も儲けていると聞いて安心した」）"
      }
    },
    {
      "name": "時間軸",
      "description": "信頼形成の時間的な経過が含まれているか",
      "weight": 0.2,
      "levels": {
        "0.0": "時間軸の言及なし",
        "0.5": "曖昧な時間言及（例: 「だんだん」）",
        "1.0": "具体的な時間経過（例: 「2週間ほどやり取りした後に」）"
      }
    }
  ],
  "total_score_formula": "weighted_average(dimensions)"
}
```

## 5.2 スコア算出

```
detail_score = Σ (dimension.weight × dimension.level_score)
```

例: 具体性=0.6, 多面性=0.3, 心理過程=0.5, 時間軸=0.0 の場合

```
score = 0.3×0.6 + 0.3×0.3 + 0.2×0.5 + 0.2×0.0 = 0.37
```

---

# 6. completion score への統合

## 6.1 改修後の算出式

```
slot_score =
  バイナリスロットの場合:
    isFilled(slot) ? weight : 0

  詳細度対象スロットの場合:
    isFilled(slot) ? weight × detail_score(slot) : 0
```

例: `why_it_felt_believable`（weight=0.1）で detail_score=0.4 の場合

```
現在: 0.1（値があれば満点）
改修後: 0.1 × 0.4 = 0.04
```

## 6.2 詳細度スコアのフォールバック

ルーブリックもサンプルも未設定の場合は、従来通りバイナリ判定（detail_score=1.0）にフォールバックする。

---

# 7. 管理画面 UI

## 7.1 インタビュー詳細画面の拡張

既存の管理画面詳細ページ（`/admin/sessions/{id}`）に以下を追加。

### スロット別回答カード

```
┌─────────────────────────────────────────┐
│ why_it_felt_believable          詳細度: 0.7  │
│                                              │
│ 抽出値: ["social_proof", "famous_person"]    │
│                                              │
│ 原文（該当箇所）:                             │
│ 「LINEグループに有名な投資家の写真があって、  │
│   他の人も毎日利益を報告してたので…」          │
│                                              │
│ [★ 良い回答としてピックアップ]                │
└─────────────────────────────────────────┘
```

各スロットごとに:
- 抽出された構造化値
- 原文中の該当箇所（extractorが特定）
- 詳細度スコア（ルーブリック適用時）
- 「良い回答としてピックアップ」ボタン

### ピックアップ時のメモ入力

ボタン押下でダイアログ表示。

```
┌──────────────────────────────────┐
│ この回答を良い回答として保存        │
│                                    │
│ メモ（任意）:                       │
│ ┌──────────────────────────────┐ │
│ │ 心理過程が具体的に述べられている │ │
│ └──────────────────────────────┘ │
│                                    │
│ [キャンセル]  [保存]                │
└──────────────────────────────────┘
```

## 7.2 ルーブリック管理画面（新規）

URL: `/admin/rubrics`

### ピックアップ一覧 + ルーブリック生成

```
┌─────────────────────────────────────────────────┐
│ ルーブリック管理                                     │
├─────────────────────────────────────────────────┤
│                                                      │
│ スロット選択: [why_it_felt_believable ▼]              │
│                                                      │
│ ── ピックアップ済みの良い回答（5件）──                 │
│                                                      │
│ 1. Session abc123 (2026-03-10)                       │
│    「LINEグループに有名な投資家の写真があって…」       │
│    メモ: 心理過程が具体的                              │
│    [削除]                                             │
│                                                      │
│ 2. Session def456 (2026-03-11)                       │
│    「公式サイトに見えるデザインで金融庁の…」            │
│    メモ: 信頼形成の多面性が良い                        │
│    [削除]                                             │
│                                                      │
│ 3. ...                                               │
│                                                      │
│ ── 現在のルーブリック ──                              │
│                                                      │
│ ステータス: active (2026-03-12 生成)                  │
│ 生成元: 5件のピックアップ                             │
│                                                      │
│ 観点1: 具体性 (30%)                                  │
│   0.0: 言及なし                                      │
│   0.3: 抽象的な言及のみ                               │
│   0.6: 一定の具体性あり                               │
│   1.0: 高い具体性                                    │
│                                                      │
│ 観点2: 多面性 (30%)                                  │
│   ...                                                │
│                                                      │
│ [ルーブリックを生成]  [ルーブリックを承認]              │
│                                                      │
└─────────────────────────────────────────────────┘
```

### 操作フロー

1. スロットを選択
2. ピックアップ済み回答の一覧を確認（削除も可能）
3. 「ルーブリックを生成」ボタン → LLMがピックアップ群の共通点を分析 → ルーブリック案を表示（status=draft）
4. リサーチャーが内容を確認
5. 「ルーブリックを承認」ボタン → status=active に変更、以降のインタビューで使用開始
6. 再生成したい場合はピックアップを追加/削除して再度「ルーブリックを生成」

---

# 8. API エンドポイント

## 8.1 ピックアップ管理

### `POST /api/admin/exemplars`

良い回答をピックアップする。`sessionId` を省略すると初期サンプル（Phase 1 用）として登録される。

```json
// セッションからのピックアップ
{
  "surveyId": "survey_001",
  "sessionId": "session_abc123",
  "slotKey": "why_it_felt_believable",
  "rawText": "LINEグループに有名な投資家の写真があって、他の人も毎日利益を報告してたので信頼してしまいました",
  "extractedValue": ["social_proof", "famous_person_image"],
  "notes": "心理過程が具体的に述べられている"
}

// Response
{
  "id": "exemplar_001",
  "createdAt": "2026-03-13T10:00:00Z"
}
```

### `GET /api/admin/exemplars?surveyId={id}&slotKey={key}`

ピックアップ一覧を取得する。

### `DELETE /api/admin/exemplars/{id}`

ピックアップを削除する。

## 8.2 初期サンプル登録（Phase 1）

ルーブリック生成前でも詳細度判定を機能させるため、リサーチャーが「約80%の詳細度レベル」の模範回答を各スロットに登録する。`sessionId` を省略し、`extractedValue` は空配列でよい。

登録されたサンプルは LLM への参照基準として使用される:
```
Reference sample answer (represents approximately 80% detail level):
{rawText}

Compare the participant's answer to this reference.
```

### 各スロットのサンプルリクエスト例

#### `why_it_felt_believable`（信じた理由）

```json
{
  "surveyId": "default",
  "slotKey": "why_it_felt_believable",
  "rawText": "LINEグループに有名な投資家を名乗る人の写真があって、他のメンバーも毎日利益のスクリーンショットを投稿していました。最初は少し怪しいと思ったんですが、2週間くらいやり取りしているうちに、実際に少額で利益が出たこともあって信頼するようになりました。友人も同じグループに入っていて『大丈夫だよ』と言っていたのも大きかったです。",
  "extractedValue": [],
  "notes": "初期サンプル — 具体性（LINEグループ・スクショ）、多面性（著名人・利益実績・友人の保証）、心理過程（怪しい→信頼へ変化）、時間軸（2週間）を含む"
}
```

#### `warning_signs_noticed`（違和感を覚えた点）

```json
{
  "surveyId": "default",
  "slotKey": "warning_signs_noticed",
  "rawText": "最初に『今だけ特別』と急かされたのが少し引っかかりました。あと、担当者が名刺も見せてくれなくて、会社のウェブサイトも検索しても出てこなかった。途中でLINEからTelegramに移動するよう言われたときに、なんでだろうとは思いましたが、他の人も普通にやっていたので深く考えませんでした。",
  "extractedValue": [],
  "notes": "初期サンプル — 複数の違和感（急かし・身元不明・プラットフォーム移動）、それぞれに具体的状況あり、心理的な葛藤も述べている"
}
```

#### `emotions_during`（体験中の気持ち）

```json
{
  "surveyId": "default",
  "slotKey": "emotions_during",
  "rawText": "最初は本当にワクワクしていました。毎日アプリで残高が増えていくのを見て、これで借金も返せるかもしれないと希望を持っていました。でも出金しようとしたら手数料を求められて、そこから急に不安になりました。もしかして騙されたのかもと思うと、手が震えて夜も眠れなくなりました。",
  "extractedValue": [],
  "notes": "初期サンプル — 感情の変化（ワクワク→希望→不安→恐怖）が時間軸に沿って具体的に描写されている"
}
```

#### `emotions_after`（その後の気持ち）

```json
{
  "surveyId": "default",
  "slotKey": "emotions_after",
  "rawText": "騙されたと確信してからは、自分が情けなくて家族にも言えませんでした。ネットで同じ手口の被害者の書き込みを見つけて、自分だけじゃないと少し安心しましたが、同時に怒りも湧いてきました。今でもSNSの広告を見ると動悸がして、投資という言葉に過敏に反応してしまいます。3ヶ月くらい寝つきが悪い日が続きました。",
  "extractedValue": [],
  "notes": "初期サンプル — 複数の感情（羞恥・安堵・怒り・恐怖）、時間経過（3ヶ月）、後遺症（広告への過敏反応）が具体的"
}
```

#### `non_monetary_harm`（お金以外の影響）

```json
{
  "surveyId": "default",
  "slotKey": "non_monetary_harm",
  "rawText": "家族にバレたときに大きな喧嘩になり、しばらく口をきいてもらえませんでした。詐欺サイトに免許証の写真を送ってしまったので、個人情報の悪用が心配で信用情報機関に問い合わせました。仕事中も気になって集中できず、上司に怒られることが増えました。人を信じることが怖くなって、新しい人間関係を作るのが億劫になりました。",
  "extractedValue": [],
  "notes": "初期サンプル — 人間関係・個人情報リスク・仕事への影響・心理的後遺症と多面的な被害を具体的に描写"
}
```

#### `what_platform_design_might_have_helped`（あれば助かった仕組み）

```json
{
  "surveyId": "default",
  "slotKey": "what_platform_design_might_have_helped",
  "rawText": "広告をクリックしたときに『この広告主は本人確認が未完了です』みたいな警告が出ていたら立ち止まれたと思います。あと、投資系の広告には過去の苦情件数や消費者庁の注意喚起へのリンクが自動で表示されるような仕組みがあれば。LINEグループに招待されたときに、そのグループが最近作られたばかりだとか、メンバーの多くが新規アカウントだとか、そういう情報が見えていたら怪しいと気づけたかもしれません。",
  "extractedValue": [],
  "notes": "初期サンプル — 3つの具体的な改善提案（広告主警告・苦情リンク・グループ情報開示）があり、それぞれ自分の体験に紐づけて説明している"
}
```

#### `what_public_warning_might_have_helped`（事前の注意喚起）

```json
{
  "surveyId": "default",
  "slotKey": "what_public_warning_might_have_helped",
  "rawText": "SNSの投資広告は詐欺が多いという話は聞いたことがありましたが、自分が見た広告がまさにそれだとは思いませんでした。具体的な手口のパターン、例えば『LINEグループに誘われて少額から始めさせる』とか『出金時に手数料を要求される』といった実際のステップが紹介されていたら気づけたと思います。テレビのニュースでやっていても自分ごとに感じなかったので、SNSのタイムラインに自然に出てくる注意喚起のほうが届いたかもしれません。",
  "extractedValue": [],
  "notes": "初期サンプル — 既存の注意喚起が効かなかった理由、具体的な手口パターンの提示、届きやすいメディアの提案まで含む"
}
```

#### `what_information_or_support_might_have_helped`（あれば助かった情報）

```json
{
  "surveyId": "default",
  "slotKey": "what_information_or_support_might_have_helped",
  "rawText": "怪しいと思った段階で、匿名でチャットで相談できる窓口があったら助かりました。消費者ホットラインは知っていましたが、電話は敷居が高くてかけられませんでした。あと、相手のLINEアカウントや振込先の口座番号を入力すると詐欺報告が出てくるようなデータベースがあれば、送金する前に確認できたと思います。被害に遭った後も、返金請求の手順や弁護士の無料相談先がまとまったサイトがあればよかったです。",
  "extractedValue": [],
  "notes": "初期サンプル — 事前（チャット相談・検索DB）と事後（返金手順・弁護士相談）の両方について、既存の課題と具体的な改善案を述べている"
}
```

## 8.2 ルーブリック管理

### `POST /api/admin/rubrics/generate`

ピックアップ群からルーブリックを生成する。

```json
// Request
{
  "surveyId": "survey_001",
  "slotKey": "why_it_felt_believable"
}

// Response
{
  "id": "rubric_001",
  "status": "draft",
  "criteria": {
    "slot_key": "why_it_felt_believable",
    "version": 1,
    "dimensions": [
      {
        "name": "具体性",
        "description": "...",
        "weight": 0.3,
        "levels": { ... }
      }
    ]
  },
  "generatedFrom": ["exemplar_001", "exemplar_002", "exemplar_003"]
}
```

### `POST /api/admin/rubrics/{id}/activate`

ルーブリックを承認・有効化する。既存の active ルーブリックは archived に変更。

### `GET /api/admin/rubrics?surveyId={id}&slotKey={key}`

ルーブリック一覧を取得する。

---

# 9. LLM プロンプト

## 9.1 ルーブリック生成プロンプト

```text
You are an evaluation criteria designer for a civic research interview system.

Given a set of exemplary answers that a researcher has selected as "good answers"
for a specific interview slot, analyze their common qualities and generate
a structured rubric for evaluating answer detail level.

Slot: {slot_key}
Slot description: {slot_description}

Exemplary answers:
{exemplar_list}

Researcher notes on these answers:
{notes_list}

Generate a rubric with 3-5 evaluation dimensions. For each dimension:
1. Give it a clear Japanese name
2. Describe what it measures
3. Assign a weight (all weights must sum to 1.0)
4. Define 3-4 levels (0.0, 0.3/0.5, 0.6/0.7, 1.0) with concrete descriptions

The rubric should capture what makes these answers valuable for research purposes.
Focus on aspects that are consistently present across the exemplary answers.

Return strict JSON only:
{
  "slot_key": "",
  "version": 1,
  "dimensions": [
    {
      "name": "",
      "description": "",
      "weight": 0.0,
      "levels": {
        "0.0": "",
        "0.3": "",
        "0.6": "",
        "1.0": ""
      }
    }
  ]
}
```

## 9.2 詳細度判定プロンプト

```text
You are an answer quality evaluator for a civic research interview.

Evaluate the detail level of the participant's answer for a specific slot.

Slot: {slot_key}
Participant's answer (relevant excerpt): {raw_text}
Extracted structured value: {extracted_value}

{rubric_or_sample_section}

Score each dimension from 0.0 to 1.0 based on the rubric levels.
Then compute the weighted average as the overall detail score.

Return strict JSON only:
{
  "dimension_scores": [
    { "name": "", "score": 0.0, "reason": "" }
  ],
  "overall_score": 0.0
}
```

### ルーブリックがある場合の `{rubric_or_sample_section}`

```text
Evaluation rubric:
{rubric_json}

Score each dimension according to the defined levels.
```

### サンプルのみの場合の `{rubric_or_sample_section}`

```text
Reference sample answer (represents approximately 80% detail level):
{sample_text}

Compare the participant's answer to this reference.
Consider: specificity, multi-faceted reasoning, psychological process, temporal context.
```

## 9.3 モデル選択

| 処理 | モデル | 理由 |
|---|---|---|
| ルーブリック生成 | Sonnet | 非リアルタイム、品質重視 |
| 詳細度判定（リアルタイム） | Haiku | 低レイテンシ、コスト効率 |
| 詳細度判定（バッチ） | Haiku | コスト効率 |

---

# 10. インタビューエンジンへの統合

## 10.1 processTurn での変更

```
現在のフロー:
  1. ユーザー発言を受信
  2. extractor で構造化抽出
  3. mergeExtraction で累積
  4. calculateCompletionScore（バイナリ）
  5. determineStage
  6. getNextSlot
  7. renderQuestion

改修後のフロー:
  1. ユーザー発言を受信
  2. extractor で構造化抽出
  3. mergeExtraction で累積
  4. 詳細度判定対象スロットに値がある場合 → Haiku で詳細度判定（並列実行可）
  5. calculateCompletionScore（詳細度スコア加味）
  6. determineStage
  7. getNextSlot ← 詳細度が低いスロットを優先的に深掘り対象にする
  8. renderQuestion
```

## 10.2 深掘り判定の変更

現在は `isFilled(slot)` が true になると次のスロットに移る。

改修後は詳細度対象スロットについて:

```
detail_score >= 0.6 → 次のスロットへ（十分）
detail_score >= 0.3 → もう1回深掘り可能（ただし最大1回追加）
detail_score < 0.3  → 深掘り質問を生成
```

閾値はリサーチャーが調整可能にする（デフォルト: 0.6）。

---

# 11. 実装ステップ

## Step 1: MVP（詳細度判定の基盤）

- [ ] DB: `exemplar_answers`, `detail_rubrics`, `detail_scores` テーブル作成
- [ ] API: ピックアップ CRUD エンドポイント
- [ ] 管理画面: インタビュー詳細にスロット別カード表示 + ピックアップボタン
- [ ] `extracted_cases` に `detail_scores` カラム追加

## Step 2: ルーブリック生成

- [ ] API: ルーブリック生成エンドポイント（LLM呼び出し）
- [ ] API: ルーブリック承認エンドポイント
- [ ] 管理画面: ルーブリック管理ページ

## Step 3: リアルタイム詳細度判定

- [ ] Haiku による詳細度判定をインタビューエンジンに統合
- [ ] completion score 算出の改修
- [ ] 深掘り判定ロジックの改修

## Step 4: 深掘り最適化

- [ ] 詳細度が低いスロットへの追加質問生成
- [ ] question-renderer に詳細度コンテキストを渡す
- [ ] 閾値のリサーチャー設定機能

---

# 12. 制約・注意事項

- ルーブリック生成は**自動生成 → リサーチャー承認**のフローを必須とする。自動適用しない
- 詳細度判定は回答者には見せない（管理側のみ）
- ピックアップ元の回答は個人情報マスキング済みの状態で保存する
- ルーブリックの archived 履歴は保持し、過去のスコアがどのルーブリックで算出されたか追跡可能にする
- Haiku による判定結果がターン間で大きくブレる場合は、直近の最大値を採用する（monotonic increase）
