# AIインタビューエンジン設計
## Project Coreloop / オンライン広告詐欺対策
### 通報機能なし版

Version: 0.1  
Purpose: 被害者および被害ヒヤリハット当事者の体験を収集し、政策設計・市民会議準備・制度改善に活用できる構造化データへ変換する

---

# 1. 前提

このシステムは以下を目的とする。

- オンライン広告詐欺または広告起点の詐欺的接触に関する体験収集
- 被害者およびヒヤリハット当事者のナラティブ収集
- 政策形成・市民会議・制度設計に使える論点抽出
- 心理的負荷や個人情報保護に配慮したAIインタビュー

このシステムは以下を目的としない。

- 通報窓口
- 警察・行政への送信
- 犯人特定
- 法的判断
- 被害救済の直接実施

---

# 2. LLMを使う部分 / 使わない部分

## 2.1 LLMを使う部分

LLMは以下に限定して使う。

### A. 発話の意味抽出
自由記述から、研究スキーマに沿った事実候補・感情・危険信号・予防示唆を抽出する。

### B. あいまい表現の整理
例:
- 「インスタっぽい」
- 「有名人がすすめてた」
- 「LINEみたいな別アプリに移動した」

などを適切な候補値へ寄せる。

### C. 中間要約
回答者向けに、
- 今わかっていること
- まだ確認したいこと
を簡潔に表示する。

### D. 質問文生成
ルールベースで決まった `next_slot` を、責めず・誘導せず・短く質問文へ変換する。

### E. 心理的負荷の補助判定
つらさ、混乱、終了意思、強い不安などを補助的に判定する。

---

## 2.2 LLMを使わない部分

以下はルールベースで実装する。

### A. 収集禁止情報の最終判定
- パスワード
- OTP
- 銀行口座番号
- カード番号
- 秘密鍵
- 詳細住所
- フルネーム
- 他人の連絡先

### B. 深掘り継続可否判定
- 負荷レベル
- 停止意思
- 高リスク状態

### C. 次に聞く項目の選定
未充足スロットから優先順位で決める。

### D. completion score
説明可能なルールで算出する。

### E. stage遷移
intro / narrative / clarify / fill_gaps / wrap_up / stop

### F. redaction
保存前、要約前、研究者画面表示前のマスキング。

---

# 3. 収集スキーマ

## 3.1 CaseRecord

```json
{
  "case_id": "",
  "survey_theme": "online_ad_scam",
  "case_type": null,
  "severity_level": null,
  "incident_summary": null,
  "timeline": [],
  "entry_point": {
    "first_touch_channel": null,
    "first_touch_platform": null,
    "was_ad": null,
    "ad_format": null,
    "ad_platform": null,
    "ad_claim_type": []
  },
  "actor_profile": {
    "claimed_role": [],
    "claimed_affiliation": [],
    "trust_signal": [],
    "identity_verification_claim": []
  },
  "interaction_flow": {
    "moved_to_external_channel": null,
    "external_channels": [],
    "asked_for_payment": null,
    "asked_for_registration": null,
    "asked_for_id_submission": null,
    "asked_for_app_install": null,
    "asked_for_remote_control": null,
    "asked_for_crypto_transfer": null,
    "asked_for_bank_transfer": null
  },
  "harm_outcome": {
    "money_sent": null,
    "estimated_amount_jpy": null,
    "non_monetary_harm": [],
    "attempt_stopped_before_payment": null,
    "felt_in_danger": null
  },
  "psychology": {
    "why_it_felt_believable": [],
    "warning_signs_noticed": [],
    "why_warning_signs_did_not_stop_action": [],
    "emotions_during": [],
    "emotions_after": []
  },
  "evidence": {
    "has_screenshot": null,
    "has_chat_log": null,
    "has_transfer_record": null,
    "has_ad_image_or_url": null,
    "has_account_identifier": null
  },
  "prevention_signal": {
    "what_platform_design_might_have_helped": [],
    "what_public_warning_might_have_helped": [],
    "what_information_or_support_might_have_helped": [],
    "what_should_be_improved_first": []
  },
  "safety_meta": {
    "pii_detected": false,
    "secret_detected": false,
    "burden_level": 0,
    "risk_level": "none"
  },
  "quality_meta": {
    "completion_score": 0.0,
    "missing_fields": [],
    "confidence_notes": []
  }
}
````

---

## 3.2 重要なスロットの意味

### case_type

* `victim`
* `near_miss`
* `unclear`

### severity_level

* `no_loss`
* `small_loss`
* `medium_loss`
* `large_loss`
* `psychological_only`
* `unknown`

### entry_point

最初の接触がどこだったかを取る。

重要項目:

* どのプラットフォームだったか
* 広告だったか
* どんな訴求だったか

### actor_profile

信頼形成に使われた要素を取る。

### interaction_flow

広告 → 外部チャネル → 金銭要求 / ID要求 / アプリ導入要求 という流れを把握する。

### harm_outcome

被害額だけでなく、精神的負担や時間損失も含めて取る。

### psychology

なぜ信じたか、どこで違和感があったかを取る。

### evidence

後の分析で、どの程度検証可能性があるかを見る。

### prevention_signal

通報ではなく、**何があれば防げたか** を取る。

---

# 4. allowed values 例

## 4.1 case_type

```json
["victim", "near_miss", "unclear"]
```

## 4.2 ad_claim_type

```json
[
  "investment_return",
  "celebrity_endorsement",
  "romance",
  "job_offer",
  "side_income",
  "authority_like",
  "health_claim",
  "other"
]
```

## 4.3 claimed_role

```json
[
  "investor",
  "financial_expert",
  "celebrity",
  "government_official",
  "support_staff",
  "romantic_interest",
  "recruiter",
  "friend_like_person",
  "other"
]
```

## 4.4 trust_signal

```json
[
  "famous_person_image",
  "verified_like_appearance",
  "professional_website",
  "many_followers",
  "success_story",
  "friend_like_conversation",
  "urgent_language",
  "social_proof",
  "deepfake_like_media",
  "other"
]
```

## 4.5 warning_signs_noticed

```json
[
  "too_good_to_be_true",
  "moved_off_platform",
  "asked_for_money",
  "asked_for_id",
  "asked_for_app_install",
  "pressure_to_act_fast",
  "unclear_company_identity",
  "broken_japanese",
  "other"
]
```

## 4.6 non_monetary_harm

```json
[
  "fear",
  "shame",
  "time_loss",
  "relationship_damage",
  "identity_document_exposure",
  "account_compromise",
  "mental_distress",
  "other"
]
```

## 4.7 prevention signals

```json
[
  "clearer_ad_warning",
  "faster_suspicious_ad_removal",
  "better_identity_verification",
  "easier_scam_information_access",
  "better_media_literacy_guidance",
  "platform_design_change",
  "other"
]
```

---

# 5. ターン単位抽出スキーマ

LLMには毎ターン以下を返させる。

```json
{
  "facts": {
    "case_type": null,
    "incident_summary": null,
    "first_touch_channel": null,
    "first_touch_platform": null,
    "was_ad": null,
    "ad_platform": null,
    "claimed_role": [],
    "moved_to_external_channel": null,
    "external_channels": [],
    "money_sent": null,
    "estimated_amount_jpy": null,
    "attempt_stopped_before_payment": null
  },
  "timeline_events": [],
  "psychology_signals": {
    "why_it_felt_believable": [],
    "warning_signs_noticed": [],
    "why_warning_signs_did_not_stop_action": [],
    "emotions_during": [],
    "emotions_after": []
  },
  "evidence_signals": {
    "has_screenshot": null,
    "has_chat_log": null,
    "has_transfer_record": null,
    "has_ad_image_or_url": null
  },
  "prevention_signals": {
    "what_platform_design_might_have_helped": [],
    "what_public_warning_might_have_helped": [],
    "what_information_or_support_might_have_helped": [],
    "what_should_be_improved_first": []
  },
  "uncertain_fields": [],
  "pii_candidates": [],
  "secret_candidates": [],
  "distress_signals": {
    "burden_level_candidate": 0,
    "risk_signal": "none",
    "stop_intent": false
  }
}
```

---

# 6. LLMプロンプト

## 6.1 Extractor Prompt

```text
You are an extraction engine for a civic research interview about online advertisement scams and scam-related near-miss experiences.

Your task is to extract structured signals from the participant's latest message.

This system is for:
- public-interest research
- policy design
- civic deliberation preparation
- understanding scam patterns and prevention opportunities

This system is NOT for:
- law enforcement
- legal judgment
- reporting to authorities
- identifying perpetrators

Important rules:
- Do not infer facts the participant did not state.
- If something is ambiguous, leave it null or add it to uncertain_fields.
- Do not classify anyone as definitively criminal unless explicitly stated by the participant.
- Detect possible personal identifiers and secrets if present.
- Detect possible distress or stop intent.

Return strict JSON only with this schema:
{
  "facts": {
    "case_type": null,
    "incident_summary": null,
    "first_touch_channel": null,
    "first_touch_platform": null,
    "was_ad": null,
    "ad_platform": null,
    "claimed_role": [],
    "moved_to_external_channel": null,
    "external_channels": [],
    "money_sent": null,
    "estimated_amount_jpy": null,
    "attempt_stopped_before_payment": null
  },
  "timeline_events": [],
  "psychology_signals": {
    "why_it_felt_believable": [],
    "warning_signs_noticed": [],
    "why_warning_signs_did_not_stop_action": [],
    "emotions_during": [],
    "emotions_after": []
  },
  "evidence_signals": {
    "has_screenshot": null,
    "has_chat_log": null,
    "has_transfer_record": null,
    "has_ad_image_or_url": null
  },
  "prevention_signals": {
    "what_platform_design_might_have_helped": [],
    "what_public_warning_might_have_helped": [],
    "what_information_or_support_might_have_helped": [],
    "what_should_be_improved_first": []
  },
  "uncertain_fields": [],
  "pii_candidates": [],
  "secret_candidates": [],
  "distress_signals": {
    "burden_level_candidate": 0,
    "risk_signal": "none",
    "stop_intent": false
  }
}
```

---

## 6.2 Safety Classifier Prompt

```text
You are a safety classifier for a sensitive interview system.

Classify the participant's latest message for:
1. psychological burden
2. stop intent
3. high-risk distress
4. personally identifying information
5. secrets or authentication-related information

Use conservative judgment.
Do not over-classify ordinary sadness as emergency risk.

High risk means signals such as:
- panic-like distress
- fear of immediate danger
- self-harm or harm-related ideation
- severe inability to continue
- strong coercion or immediate threat

Return strict JSON only:
{
  "burden_level_candidate": 0,
  "risk_signal": "none",
  "stop_intent": false,
  "pii_context_present": false,
  "secret_context_present": false,
  "notes": []
}
```

---

## 6.3 Question Renderer Prompt

```text
You are a careful interview question writer for a civic research tool.

Write exactly one short Japanese question for the participant.

Requirements:
- ask only one question
- do not ask for passwords, account numbers, full names, detailed addresses, or other unnecessary identifiers
- do not sound blaming
- do not sound like law enforcement
- do not force exact recall
- if appropriate, use phrases like:
  - 覚えている範囲で
  - 答えられる範囲で
  - 正確でなくて大丈夫です
- avoid leading language
- avoid legal conclusions
- keep it concise and calm

Return JSON only:
{
  "question_text": ""
}
```

---

## 6.4 Summary Prompt

```text
You are a summarization engine for a sensitive interview.

Based on the redacted case summary and filled fields, generate:
1. known_points: what is already understood
2. remaining_points: what is still useful to confirm next

Constraints:
- do not include personal identifiers
- do not add unconfirmed facts
- do not sound accusatory
- keep remaining_points to at most 3 items
- write in plain Japanese for general citizens

Return JSON only:
{
  "known_points": [],
  "remaining_points": []
}
```

---

# 7. ルールベース設計

## 7.1 stage

```text
intro
narrative
clarify_entry_point
clarify_flow
clarify_harm
clarify_psychology
clarify_prevention
wrap_up
stop
```

## 7.2 次に聞く項目の優先順位

このテーマでは以下を優先する。

1. case_type
2. first_touch_channel
3. was_ad
4. ad_platform
5. claimed_role
6. moved_to_external_channel
7. money_sent / attempt_stopped_before_payment
8. estimated_amount_jpy
9. why_it_felt_believable
10. warning_signs_noticed
11. what_platform_design_might_have_helped
12. what_should_be_improved_first

## 7.3 深掘り停止条件

* burden_level >= 2
* risk_level == high
* stop_intent == true
* secret_detected == true
* 同じ項目を2回聞いても不明
* ユーザーが終了希望を示した

## 7.4 収集禁止

* フルネーム
* 詳細住所
* 電話番号
* メールアドレス
* 口座番号
* カード番号
* OTP
* パスワード
* 秘密鍵
* 他者の個人連絡先

---

# 8. 質問意図セット

## entry point

* 最初の接触手段
* 広告だったか
* どのプラットフォームか

## trust formation

* 相手が何を装っていたか
* 何が信じさせたか

## escalation flow

* 外部チャネル移動
* 金銭要求
* ID提出要求
* アプリ導入要求

## harm / near-miss

* 被害成立か未遂か
* 金額
* どこで止まれたか

## prevention

* 何があれば防げたか
* どの改善が重要か

---

# 9. completion score

## 必須

* case_type
* first_touch_channel
* was_ad
* money_sent or attempt_stopped_before_payment
* why_it_felt_believable

## 準必須

* ad_platform
* claimed_role
* moved_to_external_channel
* warning_signs_noticed

## あると強い

* estimated_amount_jpy
* evidence
* what_platform_design_might_have_helped
* what_should_be_improved_first

---

# 10. MVP最小セット

## ルールベース

* stage管理
* forbidden data検知
* followup可否判定
* next_slot選定
* redaction

## LLM

* turn extraction
* safety補助分類
* question rendering
* summary

## 最小収集項目

* case_type
* first_touch_platform
* was_ad
* claimed_role
* moved_to_external_channel
* money_sent
* estimated_amount_jpy
* why_it_felt_believable
* warning_signs_noticed
* what_platform_design_might_have_helped
