 # Undone 公式サイト
 
 Undone（合同会社Undone）の公式サイトです。企画・脚本・撮影・編集まで一貫して行う映像制作チームとして、エンタメ・企業・教育・公的機関まで幅広く対応しています。
 
 ## 目的
 - 公式サイトの公開用ソース管理
 - 制作実績やサービス情報の継続的な更新
 - 機械可読性を高め、将来的な検索・要約・推薦に備える
 
 ## 構成
 - `index.html`: トップページ
 - `lineup.html`: 制作実績一覧
 - `assets/data/productions.json`: 制作実績データ
 - `css/`, `js/`, `container/`: スタイル・スクリプト・アセット
 
 ## 更新ガイド
 - 制作実績は `assets/data/productions.json` を編集してください。
 - 画像や動画の追加は `container/` 配下に配置します。
 - レイアウト変更は `css/style.css`、動作変更は `js/script.js` を編集します。
 
 ## 公開
 - 静的ファイルとして配信します（Cloudflare Pages など）。
 - ローカル確認は以下で行えます。
 
 ```bash
 cd "01_Web/undonejp"
 python -m http.server 8000
 ```
 
 ブラウザで `http://localhost:8000/` にアクセスしてください。
 
 ## 連絡先
 - お問い合わせフォーム: https://form.run/@undone-33ZwMm0JsvD5iTRwIpOS
 - メール: info@undone.jp
 
 ## ライセンス
- コード（HTML/CSS/JS/JSONなどのソース）は MIT License とします。
- デザイン、ロゴ、画像、動画、文章などの制作物は著作権保護の対象であり、無断利用・転載は禁止です。
- 詳細は `LICENSE` を参照してください。
