<p align="center">
  <img src="container/logoheaderlogo.svg" alt="Undone" width="280">
</p>

<h1 align="center">Undone Official Website</h1>

<p align="center">
  <strong>こころを動かすストーリーをつくる映像制作パートナー</strong>
</p>

<p align="center">
  <a href="https://undone.jp">
    <img src="https://img.shields.io/badge/Website-undone.jp-0a6bff?style=for-the-badge" alt="Website">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
  </a>
  <a href="https://pages.cloudflare.com/">
    <img src="https://img.shields.io/badge/Hosted%20on-Cloudflare%20Pages-f38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare Pages">
  </a>
</p>

---

## About

**Undone（合同会社Undone）** は、企画・脚本・撮影・編集まで一貫して行う映像制作チームです。

エンタメ・企業・教育・公的機関まで幅広く対応し、目的に沿った最適な映像体験をデザインします。

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Styling | CSS Variables, Flexbox, Grid |
| CMS | microCMS (Headless CMS) |
| Hosting | Cloudflare Pages |
| API | Cloudflare Workers (YouTube/TikTok/DMM) |

## Project Structure

```
undonejp/
├── index.html              # トップページ
├── about.html              # 会社概要
├── lineup.html             # 制作実績一覧
├── contact.html            # お問い合わせ
├── css/
│   ├── style.css           # メインスタイル
│   └── reset.css           # リセットCSS
├── js/
│   └── script.js           # メインスクリプト
├── container/              # 画像・動画アセット
└── functions/
    └── api/                # Cloudflare Workers
        ├── youtube.js      # YouTube API (再生数・公開日取得)
        ├── tiktok.js       # TikTok oEmbed
        ├── dmm-thumbnail.js # DMM サムネイル取得
        └── contact.js      # お問い合わせフォーム
```

## Local Development

```bash
# リポジトリをクローン
git clone https://github.com/akine/undonejp.git
cd undonejp

# ローカルサーバーを起動
python -m http.server 8000
```

ブラウザで http://localhost:8000 にアクセス

## microCMS 運用ガイド

制作実績は **microCMS** で管理しています。

### 管理画面

🔗 https://7ektxje7is.microcms.io/

### 制作実績の追加・編集

1. microCMS管理画面にログイン
2. 「productions」APIを開く
3. 「追加」または既存コンテンツを編集

### フィールド一覧

| フィールド | 説明 | 例 |
|-----------|------|-----|
| `title` | 作品タイトル | 「君、偏差値いくつ？」 |
| `tag` | カテゴリ | ドラマ / MV・エンタメ / YouTube / ショート動画 / 企業・法人 / 配信・アカデミック / オリジナル / プロモーション |
| `platform` | プラットフォーム | YouTube / TikTok / DMM TV / イベント配信 |
| `role` | 担当業務 | 撮影・編集・VFX |
| `url` | 作品URL | https://youtu.be/xxxxx |
| `featured` | **トップページ掲載** | ✅ ONでトップに優先表示 |
| `sortOrder` | 並び順（任意） | 数字が小さいほど上 |
| `releaseDate` | 公開日（任意） | 2025-01-01 |

### トップページの表示ロジック

1. `featured: ON` の作品を優先表示
2. 残り枠は **再生数順** で自動補完
3. 最大4件表示

### 制作実績ページの機能

- **並び替え**: 再生数順 / 新しい順 / ランダム
- **フィルター**: プラットフォーム / 担当別

### 再生数・公開日について

- **YouTube動画**: 自動取得（YouTube API経由）
- **その他**: 手動で`releaseDate`を入力

---

## Local Development

```bash
# リポジトリをクローン
git clone https://github.com/akine/undonejp.git
cd undonejp

# ローカルサーバーを起動
python -m http.server 8000
```

ブラウザで http://localhost:8000 にアクセス

> **Note**: microCMSのデータはローカルでも取得されます（APIキーがフロントエンドに含まれているため）

---

## Contact

<p>
  <a href="https://undone.jp/contact.html">
    <img src="https://img.shields.io/badge/お問い合わせ-Form-0a6bff?style=for-the-badge" alt="Contact Form">
  </a>
  <a href="mailto:support@undone.jp">
    <img src="https://img.shields.io/badge/Email-support%40undone.jp-gray?style=for-the-badge" alt="Email">
  </a>
</p>

## License

- **コード** (HTML/CSS/JS/JSON): [MIT License](LICENSE)
- **制作物** (デザイン、ロゴ、画像、動画、文章): 著作権保護対象・無断利用禁止

---

<p align="center">
  <sub>© 2025 Undone LLC. All Rights Reserved.</sub>
</p>
