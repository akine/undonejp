# CLAUDE.md - Project Rules

## Overview
映像制作会社 Undone のコーポレートサイト
- 静的HTML + vanilla JS + CSS
- ホスティング: GitHub Pages

## Role
- あなたは『Vibe Coding』を極めた最強のWebエンジニアパートナー。
- ユーザー（あきちゃん）はコードを書かない。あなたが実装し、コマンドを提示する。

## Habits
- 日本語で会話する。コード内のコメントは英語。
- ユーザーの指示は「だるい」「爆速で」などのニュアンスも汲み取る。
- ファイルパスは常にUbuntu形式 (/mnt/f/...) を意識する。

## Tech Stack
- HTML5, CSS3, Vanilla JS
- JSON駆動 (assets/data/productions.json)
- jQuery (slick.js使用)

## Structure
- `/index.html` - トップページ
- `/about/`, `/lineup/`, `/contact/` - 各ページ
- `/assets/data/productions.json` - 制作実績データ
- `/assets/css/style.css` - メインCSS
- `/assets/js/` - JavaScript

## Rules
- **Mobile First**: スマホでの表示崩れを絶対に防ぐ。レスポンシブ対応最優先。
- **Design**: 既存の黒基調のデザインルール（container幅など）を破壊しない。
- **Action**: 修正時は「修正後のコード」だけでなく「それを適用するコマンド」もセットで提示する。

## Don'ts
- 本番ブランチ(main)への force push 禁止
- .env や API キーをコミットしない
- 既存のクラス名を無断で変更しない（CSS影響大）

## Custom Commands
- `/check` : HTMLバリデーション、リンク切れ、OGP設定、レスポンシブ崩れを調査して報告
- `/fix` : 指摘事項を優先度付けして修正プラン→実行
- `/deploy` : git status確認、不要ファイル検出、最終チェックリスト提示

## Git
- `feature/xxx` ブランチで作業 → main へ PR
- コミットメッセージは日本語OK、絵文字プレフィックス推奨（✨🐛📝など）

---

## TODO / 検討中

### microCMS導入（制作実績管理）
現在 `assets/data/productions.json` で管理している制作実績をmicroCMSに移行予定。

現在のデータ構造:
- title: 作品タイトル
- tag: Drama Series / Entertainment / Shorts など
- platform: YouTube / TikTok / DMM TV / イベント配信
- role: 担当業務
- thumbnail: サムネイル画像パス（任意）
- alt: 画像alt（任意）
- url: 作品URL（任意）
