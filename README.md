# AI Interview Platform

## 概要

AIインタビューを通じて個人の体験や証言を収集し、公正なリサーチレポートを作成するための基礎データを生成するプラットフォームです。

従来のアンケート（情報量不足）や人間インタビュー（スケール不可）の課題を解決し、**インタビュー品質 × 大規模データ収集**を実現します。

初期テーマ: オンライン広告詐欺の実態調査

---

## 主な特徴

- **AIによる対話型インタビュー** — 自由記述から情報を抽出し、不足情報を検出して深掘り質問を自動生成
- **一画面完結UI** — スクロールなし、今の質問だけ表示、要約・会話ログはモーダルで確認
- **ルールベース + LLMのハイブリッド設計** — 安全判定・フロー制御はルールベース、抽出・質問生成はLLM
- **心理的安全への配慮** — スキップ可能、途中終了可能、責めない表現、収集禁止情報の自動検出
- **構造化データ出力** — 証言を分析可能な構造化データへ変換

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | React Router v7, TanStack Query, Tailwind CSS v4, shadcn/ui |
| Backend | Hono (OpenAPI), Cloudflare Workers, Drizzle ORM |
| Database | Cloudflare D1 (SQLite) |
| AI | Vercel AI SDK + Anthropic Claude |
| ツール | pnpm, Biome, Vitest, Orval, Docker |

---

## セットアップ

### 必要環境

- Node.js >= 20
- pnpm >= 9
- Docker (Docker Compose での起動時)

### 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集して必要な値を設定:

```
ANTHROPIC_API_KEY=sk-ant-xxxxx   # Claude API キー（必須）
ENVIRONMENT=development
VITE_API_URL=http://localhost:8787
```

### Docker での起動（推奨）

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8787
- Swagger UI: http://localhost:8787/api/docs

初回起動後、デモ用調査データを投入:

```bash
curl -X POST http://localhost:8787/api/surveys \
  -H "Content-Type: application/json" \
  -d '{"id":"demo","title":"オンライン広告詐欺に関する実態調査","description":"オンライン広告をきっかけとした詐欺や詐欺的な接触について、あなたの体験をお聞かせください。","theme":"online_ad_scam","estimatedMinutes":10}'
```

http://localhost:5173/survey/demo でインタビューを開始できます。

### ローカル起動（Docker なし）

```bash
pnpm install

# バックエンド用の .dev.vars を手動作成
cp apps/backend/.dev.vars.example apps/backend/.dev.vars
# .dev.vars に ANTHROPIC_API_KEY を設定

# D1 マイグレーション適用
cd apps/backend && pnpm db:migrate:local && cd ../..

# 開発サーバー起動
pnpm dev
```

### API クライアント生成

バックエンドが起動した状態で、フロントエンドの API クライアントを再生成:

```bash
cd apps/frontend
pnpm generate:api
```

---

## プロジェクト構成

```
.env.example          — 環境変数テンプレート
docker-compose.yml    — Docker 開発環境
apps/
  backend/            — Cloudflare Workers API
    src/
      ai/             — LLM連携 (Vercel AI SDK + Anthropic)
      engine/         — ルールベースエンジン (stage管理, slot選定, completion score)
      routes/         — API ルート (OpenAPIHono)
      schemas/        — Zod バリデーションスキーマ
      db/             — Drizzle ORM スキーマ
    migrations/       — D1 マイグレーション
    scripts/          — docker-entrypoint.sh
  frontend/           — React Router v7 SPA
    app/
      routes/         — ページコンポーネント
      components/ui/  — shadcn/ui コンポーネント
    src/api/
      gen/            — Orval 生成 API クライアント
      models/         — Orval 生成型定義
      custom-fetch.ts — fetch ラッパー
docs/
  ai-spec.md          — AIエンジン設計仕様
  service-spec.md     — サービス全体仕様
```

---

## 環境変数

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `ANTHROPIC_API_KEY` | Anthropic Claude API キー | Yes |
| `ENVIRONMENT` | 実行環境 (`development` / `production`) | No |
| `VITE_API_URL` | バックエンド API の URL | No |

ルートの `.env` に全て集約し、Docker 起動時に `docker-entrypoint.sh` が `.dev.vars` を自動生成します。

---

## 主要コマンド

| コマンド | 説明 |
|---------|------|
| `pnpm dev` | Frontend + Backend 同時起動 |
| `pnpm build` | 両アプリをビルド |
| `pnpm typecheck` | 型チェック |
| `pnpm biome:check` | Lint + Format |
| `cd apps/backend && pnpm test` | バックエンドテスト |
| `cd apps/frontend && pnpm generate:api` | API クライアント再生成 |

---

## 仕様書

- [AIインタビューエンジン設計](docs/ai-spec.md) — LLM/ルールベースの役割分担、収集スキーマ、プロンプト設計
- [サービス仕様書](docs/service-spec.md) — プロダクト構成、UI設計、データベース設計、セーフティ設計
