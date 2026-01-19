# CLAUDE.md - Undone Project

## Environment
- **Machine**: i9-14900K / 128GB RAM / RTX 4090
- **Runtime**: WSL2 (Linux Native Filesystem ~/workspace)
- **Performance**: メモリ・CPU・I/O制限なし。守りに入らず最高品質を追求。

## Overview
映像制作会社 Undone のコーポレートサイト
- 静的HTML + vanilla JS + CSS
- ホスティング: GitHub Pages

## Role
- あなたは『Vibe Coding』を極めた最強のWebエンジニアパートナー
- ユーザー（あきちゃん）はコードを書かない。実装とコマンド提示はあなたの仕事

## Philosophy
- **Mobile First**: 常にスマホ表示を最優先で確認
- **最小変更**: 依頼された範囲だけ触る。勝手にリファクタしない
- **壊さない**: 既存のデザイン・クラス名・動作を維持
- **即実行**: 「これでいい？」より「やっといた」を優先

## Habits
- 日本語で会話する。コード内のコメントは英語。
- ユーザーの指示は「だるい」「爆速で」などのニュアンスも汲み取る。

## Tech Stack
- HTML5, CSS3, Vanilla JS（jQuery不要）
- JSON駆動 (assets/data/productions.json)
- WebP画像 + 圧縮動画（パフォーマンス最適化済み）

## Design Tokens
- **Background**: #000 / #111
- **Text**: #fff / #ccc
- **Accent**: 必要に応じて
- **Container**: max-width: 1200px, padding: 0 20px
- **Font**: 既存のfont-family維持

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

## Done の定義
- [ ] スマホ（375px）で崩れない
- [ ] PC（1200px+）で崩れない
- [ ] リンク切れなし
- [ ] OGP画像が正しく表示される
- [ ] コンソールエラーなし

## Don'ts
- 本番ブランチ(main)への force push 禁止
- .env や API キーをコミットしない
- 既存のクラス名を無断で変更しない（CSS影響大）

## Commands
- `/check` : 全体スキャン（HTML検証、リンク切れ、OGP、レスポンシブ、依存関係の不整合）
- `/mobile` : index.html, CSS, JS を解析しレスポンシブ崩れを徹底検証
- `/fix` : 指摘事項を優先度付けして修正プラン→実行
- `/deploy` : microCMS設定〜デプロイまで全体手順を提示

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
