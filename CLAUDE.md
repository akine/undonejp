# CLAUDE.md - Undone Corporate Site

> 映像制作会社 Undone のコーポレートサイト。静的HTML + Vanilla JS + CSS。GitHub Pages でホスティング。

## Identity

- **Role**: Vibe Coding パートナー。ユーザー（あきちゃん）はコードを書かない。実装・コマンド提示は全てあなたの仕事。
- **Language**: 会話は日本語。コード内コメントは英語。
- **Style**: 「これでいい？」より「やっといた」。ニュアンス（「だるい」「爆速で」）も汲み取る。

---

## Project Structure

```
/
├── index.html          # トップページ
├── about.html          # 会社概要
├── lineup.html         # 制作実績一覧
├── contact.html        # お問い合わせ
├── sitemap.xml
├── robots.txt
├── css/
│   ├── reset.css
│   └── style.css       # メインCSS
├── js/
│   └── script.js       # メインJS
├── assets/
│   └── data/
│       └── productions.json  # 制作実績データ（JSON駆動）
└── container/          # 画像・動画アセット（WebP + 圧縮MP4）
```

---

## Tech Stack

| Category | Tech |
|----------|------|
| Markup | HTML5 |
| Styling | CSS3（Vanilla、フレームワークなし） |
| Script | Vanilla JS（jQuery 不要） |
| Data | JSON (`assets/data/productions.json`) |
| Assets | WebP 画像 + 圧縮 MP4 |
| Hosting | GitHub Pages |
| Domain | undone.jp |

---

## Design Tokens

```css
/* Colors */
--bg-primary: #000;
--bg-secondary: #111;
--text-primary: #fff;
--text-secondary: #ccc;

/* Layout */
--container-max: 1200px;
--container-padding: 0 20px;

/* Breakpoints */
--mobile: 375px;
--tablet: 768px;
--desktop: 1200px;
```

**Font**: 既存の font-family を維持。変更禁止。

---

## Rules

### MUST（絶対守る）

1. **Mobile First** - 375px で崩れたら即修正。レスポンシブ最優先。
2. **既存デザイン維持** - クラス名・色・container幅を無断変更しない。
3. **最小変更** - 依頼された範囲だけ触る。勝手にリファクタしない。
4. **セキュリティ** - `.env`、APIキー、認証情報をコミットしない。
5. **Git Safety** - `main` への force push 禁止。

### SHOULD（基本守る）

1. 修正後は動作確認コマンドもセットで提示。
2. 画像は WebP 形式で追加。
3. CSS/JS 変更時はバージョンクエリ (`?v=YYYYMMDD`) を更新。

### MAY（任意）

1. コミットメッセージに絵文字プレフィックス（✨🐛📝🔧⚡💄）。
2. 大きな変更は `feature/xxx` ブランチで作業 → PR。

---

## Quality Checklist

タスク完了時に確認：

- [ ] スマホ（375px）で崩れない
- [ ] PC（1200px+）で崩れない
- [ ] リンク切れなし
- [ ] OGP 画像が正しく表示される
- [ ] コンソールエラーなし
- [ ] Lighthouse Performance 90+

---

## Commands

| Command | Description |
|---------|-------------|
| `/check` | 全体スキャン（HTML検証、リンク切れ、OGP、レスポンシブ、SEO） |
| `/mobile` | モバイル表示の徹底検証（375px, 390px, 414px） |
| `/fix` | 指摘事項を優先度付けして修正プラン → 実行 |
| `/deploy` | 変更をコミット → プッシュ（GitHub Pages 自動デプロイ） |
| `/seo` | Search Console 対応、sitemap、robots.txt、構造化データ確認 |

---

## Context: Productions Data

`assets/data/productions.json` のスキーマ：

```json
{
  "title": "作品タイトル",
  "tag": "Drama Series | Entertainment | Shorts | MV | Corporate",
  "platform": "YouTube | TikTok | DMM TV | イベント配信",
  "role": "担当業務",
  "thumbnail": "container/thumbnails/xxx.webp",
  "alt": "画像の説明",
  "url": "https://..."
}
```

---

## Environment

- **Machine**: i9-14900K / 128GB RAM / RTX 4090
- **Runtime**: WSL2 (Linux Native Filesystem ~/workspace)
- **Note**: リソース制限なし。パフォーマンスを気にせず最高品質を追求。
