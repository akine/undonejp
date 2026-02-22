# undonejp セキュリティ監査レポート

**監査日**: 2026-02-22  
**監査者**: Black Hacker / ペネトレーションテスター  
**対象**: undonejp（Cloudflare Pages + Functions）

## 概要

undonejp の静的サイト + Cloudflare Pages Functions の脆弱性分析を実施。5つのAPIエンドポイントと静的サイトコードを分析し、**多数の深刻な脆弱性**を発見しました。

## CRITICAL（緊急対応必要）

### 🚨 C1. microCMS APIキー完全露出
**ファイル**: `js/script.js` 60-63行目  
**脆弱性**: APIキーが平文でクライアントサイドに埋め込まれている
```javascript
const MICROCMS_CONFIG = {
    serviceDomain: '7ektxje7is',
    apiKey: 'CCak6hOuIEp4rE0deKXxSGaWAH54K0jMJH6J',  // ← 完全公開！
    endpoint: 'productions'
};
```
**影響**: 
- microCMS APIを無制限に呼び出し可能
- 料金爆発攻撃
- データ取得し放題

**修正案**: 
- APIキーを環境変数に移動
- Functions経由でプロキシ化（`/api/microcms` エンドポイント作成）
- クライアントサイドからの直接アクセス禁止

### 🚨 C2. SSRF（Server-Side Request Forgery）
**ファイル**: `functions/api/tiktok.js` 19-25行目  
**脆弱性**: ユーザー提供URLを検証なしで直接fetch
```javascript
const apiUrl = `https://www.tiktok.com/oembed?${params.toString()}`;
const response = await fetch(apiUrl);  // ← 任意URL攻撃可能
```
**攻撃シナリオ**:
```bash
# AWS メタデータサービス攻撃
GET /api/tiktok?urls=http://169.254.169.254/latest/meta-data/iam/security-credentials/

# 内部ポートスキャン
GET /api/tiktok?urls=http://localhost:22,http://localhost:3306,http://localhost:6379

# ファイル読み取り試行
GET /api/tiktok?urls=file:///etc/passwd
```
**影響**: 
- 内部ネットワーク侵害
- クラウドメタデータ取得
- DoS攻撃

**修正案**:
```javascript
const allowedHosts = new Set(['www.tiktok.com', 'tiktok.com']);
const targetUrl = new URL(videoUrl);
if (!allowedHosts.has(targetUrl.hostname)) {
    return [videoUrl, null];
}
```

### 🚨 C3. メールヘッダインジェクション
**ファイル**: `functions/api/contact.js` 72行目  
**脆弱性**: emailフィールドをReply-Toに直接使用
```javascript
reply_to: email,  // ← バリデーション不足
```
**攻撃シナリオ**:
```bash
POST /api/contact
Content-Type: application/json

{
  "name": "攻撃者",
  "email": "test@example.com\nBcc: spam@example.com\nSubject: スパム",
  "message": "メールヘッダ改ざん攻撃"
}
```
**影響**: 
- スパムメール送信
- メールヘッダ改ざん
- フィッシング攻撃踏み台

**修正案**:
```javascript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email) || email.includes('\n') || email.includes('\r')) {
    return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { 'content-type': 'application/json; charset=utf-8' }
    });
}
```

### 🚨 C4. Slack実績登録システム - 認証バイパス
**ファイル**: `functions/api/slack-jisseki.js` 全体  
**脆弱性**: Slack署名検証なし。POST /api/slack-jisseki で外部から実行可能
```javascript
// 署名検証がない！
export async function onRequestPost(context) {
    const { request, env } = context;
    // ↑ 誰でもアクセス可能
```
**攻撃シナリオ**:
```bash
# 外部からmicroCMSに偽コンテンツ大量投入
curl -X POST https://undone.jp/api/slack-jisseki \
  -H "Content-Type: application/json" \
  -d '{"trigger_id":"fake","payload":"{\"view\":{\"state\":{\"values\":{\"url_block\":{\"url_input\":{\"value\":\"https://evil.com\"}},\"role_block\":{\"role_input\":{\"value\":\"攻撃者\"}},\"tag_block\":{\"tag_select\":{\"selected_option\":{\"value\":\"Drama Series\"}}}}}}}}"}'
```
**影響**: 
- 実績データ改ざん
- microCMS汚染
- 偽情報拡散

**修正案**: Slack署名検証を実装
```javascript
const verifySlackSignature = (signature, timestamp, body, signingSecret) => {
    const hmac = crypto.createHmac('sha256', signingSecret);
    hmac.update(`v0:${timestamp}:${body}`);
    const expectedSignature = `v0=${hmac.digest('hex')}`;
    return signature === expectedSignature;
};
```

## HIGH（高優先度対応）

### 🔴 H1. CSRF対策なし
**ファイル**: 全APIエンドポイント  
**脆弱性**: CSRFトークンやOriginチェックなし
**影響**: 他サイトから攻撃可能
**修正案**: 
```javascript
const origin = request.headers.get('Origin');
const allowedOrigins = ['https://undone.jp', 'https://www.undone.jp'];
if (!allowedOrigins.includes(origin)) {
    return new Response('Forbidden', { status: 403 });
}
```

### 🔴 H2. YouTube APIキー漏洩リスク
**ファイル**: `functions/api/youtube.js` 2行目, `functions/api/slack-jisseki.js` 517行目  
**脆弱性**: エラー時にAPIキーが漏洩する可能性
**修正案**: エラーハンドリング強化

### 🔴 H3. Rate Limiting未実装
**ファイル**: 全APIエンドポイント  
**脆弱性**: API呼び出し制限なし
**攻撃シナリオ**: 
- YouTube API クォータ枯渇攻撃
- Resend API料金爆発攻撃
- DoS攻撃

**修正案**: Cloudflare Rate Limiting または実装レベルでの制限

### 🔴 H4. Slack実績システム - TikTok SSRF
**ファイル**: `functions/api/slack-jisseki.js` 529行目  
**脆弱性**: 
```javascript
const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
const response = await fetch(oembedUrl);  // ← URLバリデーションなし
```

## MEDIUM（中優先度）

### 🟡 M1. URLバイパスリスク（DMM）
**ファイル**: `functions/api/dmm-thumbnail.js` 20行目  
**脆弱性**: `hostname`チェックでバイパス可能性
**攻撃例**: `http://tv.dmm.com.evil.com/`, `http://tv.dmm.com@evil.com/`
**修正案**: より厳密なURL検証

### 🟡 M2. YouTubeID検証不足
**ファイル**: `functions/api/youtube.js` 11-14行目  
**脆弱性**: Video IDフォーマット未チェック
**修正案**: 
```javascript
const validIdRegex = /^[a-zA-Z0-9_-]{11}$/;
const validIds = ids.filter(id => validIdRegex.test(id));
```

### 🟡 M3. JSON.parse例外未処理
**ファイル**: `functions/api/slack-jisseki.js` 18行目  
**脆弱性**: 不正JSON処理で例外発生の可能性

### 🟡 M4. XSS（DOM-based）リスク
**ファイル**: `js/script.js` createCard関数  
**脆弱性**: microCMSデータの直接DOM挿入

### 🟡 M5. microCMS Write権限過大
**ファイル**: `functions/api/slack-jisseki.js` 423行目  
**脆弱性**: 削除・作成権限を持つAPIキー使用
**修正案**: Read-Only APIキーに変更、Write操作は別の検証済みエンドポイントで

## LOW（低優先度）

### 🟢 L1. CORSヘッダー未設定
**ファイル**: 全APIエンドポイント  
**修正案**: 適切なAccess-Control-Allow-Origin設定

### 🟢 L2. Content Security Policy (CSP) なし
**ファイル**: HTMLファイル  
**修正案**: 
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com;">
```

### 🟢 L3. 入力長さ制限なし
**ファイル**: 全APIエンドポイント  
**修正案**: フィールド長制限（例：message 5000文字）

### 🟢 L4. ReDoS（正規表現DoS）リスク
**ファイル**: `functions/api/dmm-thumbnail.js` 37,41行目  
**修正案**: より効率的な正規表現使用

## INFO（情報）

### ℹ️ I1. 固定User-Agent
**ファイル**: `functions/api/dmm-thumbnail.js` 22行目  
**情報**: 検出されやすい固定値使用

### ℹ️ I2. 外部API依存
**情報**: YouTube, TikTok, microCMS, Slack APIの可用性依存

## 総合評価

**リスクレベル**: 🚨 **CRITICAL**

- **CRITICAL: 4件** - 即座に修正が必要
- **HIGH: 4件** - 優先的に対応
- **MEDIUM: 5件** - 計画的に対応
- **LOW: 4件** - 時間があるときに対応

## 推奨対応順序

1. **緊急（24時間以内）**:
   - C1: microCMS APIキー移動
   - C2: TikTok SSRF修正
   - C3: メールバリデーション追加

2. **高優先（1週間以内）**:
   - C4: Slack署名検証実装
   - H1-H3: CSRF対策、Rate Limiting

3. **中優先（1ヶ月以内）**:
   - M1-M5の修正

4. **低優先（適宜）**:
   - L1-L4, I1-I2の対応

## セキュリティ運用推奨事項

1. **定期監査**: 3ヶ月ごとのコードレビュー
2. **依存関係監視**: npm audit, 外部API変更追跡
3. **ログ監視**: 異常なアクセスパターンの検知
4. **バックアップ**: microCMSデータの定期バックアップ
5. **インシデント対応計画**: 攻撃検知時の対応手順整備

---
**注意**: このレポートは教育目的での脆弱性分析結果です。実際の攻撃に使用することは禁じられています。