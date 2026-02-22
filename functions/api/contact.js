// Escape HTML special characters to prevent injection
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export async function onRequestPost(context) {
    const { request, env } = context;

    // CSRF対策: Originヘッダーチェック
    const origin = request.headers.get('Origin') || request.headers.get('Referer');
    const allowedOrigins = [
        'https://undone.jp',
        'https://www.undone.jp',
        'https://undonejp.pages.dev' // Cloudflare Pages preview domain
    ];
    
    if (origin) {
        try {
            const originUrl = new URL(origin);
            const originHost = `${originUrl.protocol}//${originUrl.host}`;
            if (!allowedOrigins.includes(originHost)) {
                return new Response(JSON.stringify({ error: 'CSRF: Invalid origin' }), {
                    status: 403,
                    headers: { 'content-type': 'application/json; charset=utf-8' }
                });
            }
        } catch (error) {
            return new Response(JSON.stringify({ error: 'CSRF: Invalid origin format' }), {
                status: 403,
                headers: { 'content-type': 'application/json; charset=utf-8' }
            });
        }
    }

    // Resend API キー
    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Server configuration error' }), {
            status: 500,
            headers: { 'content-type': 'application/json; charset=utf-8' }
        });
    }

    // リクエストボディを取得
    let body;
    try {
        body = await request.json();
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid request body' }), {
            status: 400,
            headers: { 'content-type': 'application/json; charset=utf-8' }
        });
    }

    const { name, company, email, category, message } = body;

    // バリデーション
    if (!name || !email || !message) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { 'content-type': 'application/json; charset=utf-8' }
        });
    }

    // メールヘッダインジェクション対策: email、name、categoryの検証
    const validateInput = (input, fieldName) => {
        if (!input) return true; // null/undefinedは許可（オプショナルフィールド）
        
        const str = String(input);
        // 改行文字、復帰文字、タブ文字の検出
        if (str.includes('\n') || str.includes('\r') || str.includes('\t')) {
            return false;
        }
        // 制御文字の検出
        if (/[\x00-\x1F\x7F]/.test(str)) {
            return false;
        }
        // フィールド長制限
        const limits = {
            name: 100,
            company: 200,
            email: 320, // RFC5321準拠
            category: 100,
            message: 5000
        };
        if (str.length > (limits[fieldName] || 1000)) {
            return false;
        }
        return true;
    };

    // 厳密なメールアドレス検証
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && validateInput(email, 'email');
    };

    if (!validateInput(name, 'name')) {
        return new Response(JSON.stringify({ error: 'Invalid name format' }), {
            status: 400,
            headers: { 'content-type': 'application/json; charset=utf-8' }
        });
    }

    if (!validateEmail(email)) {
        return new Response(JSON.stringify({ error: 'Invalid email format' }), {
            status: 400,
            headers: { 'content-type': 'application/json; charset=utf-8' }
        });
    }

    if (!validateInput(company, 'company')) {
        return new Response(JSON.stringify({ error: 'Invalid company format' }), {
            status: 400,
            headers: { 'content-type': 'application/json; charset=utf-8' }
        });
    }

    if (!validateInput(category, 'category')) {
        return new Response(JSON.stringify({ error: 'Invalid category format' }), {
            status: 400,
            headers: { 'content-type': 'application/json; charset=utf-8' }
        });
    }

    if (!validateInput(message, 'message')) {
        return new Response(JSON.stringify({ error: 'Invalid message format' }), {
            status: 400,
            headers: { 'content-type': 'application/json; charset=utf-8' }
        });
    }

    // メール本文を作成
    const emailBody = `
【お問い合わせ種別】
${category || '未選択'}

【お名前】
${name}

【会社名・団体名】
${company || '未記入'}

【メールアドレス】
${email}

【お問い合わせ内容】
${message}

---
このメールは undone.jp のお問い合わせフォームから送信されました。
    `.trim();

    // HTMLメール本文
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #07090e; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .field { margin-bottom: 16px; }
        .label { font-weight: bold; color: #0a6bff; font-size: 12px; text-transform: uppercase; }
        .value { margin-top: 4px; }
        .message { background: #fff; padding: 16px; border-radius: 8px; border: 1px solid #eee; white-space: pre-wrap; }
        .footer { margin-top: 20px; font-size: 12px; color: #888; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0;">新しいお問い合わせ</h2>
            <p style="margin: 8px 0 0; opacity: 0.8;">undone.jp</p>
        </div>
        <div class="content">
            <div class="field">
                <div class="label">お問い合わせ種別</div>
                <div class="value">${escapeHtml(category) || '未選択'}</div>
            </div>
            <div class="field">
                <div class="label">お名前</div>
                <div class="value">${escapeHtml(name)}</div>
            </div>
            <div class="field">
                <div class="label">会社名・団体名</div>
                <div class="value">${escapeHtml(company) || '未記入'}</div>
            </div>
            <div class="field">
                <div class="label">メールアドレス</div>
                <div class="value"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></div>
            </div>
            <div class="field">
                <div class="label">お問い合わせ内容</div>
                <div class="message">${escapeHtml(message).replace(/\n/g, '<br>')}</div>
            </div>
        </div>
        <div class="footer">
            このメールは undone.jp のお問い合わせフォームから自動送信されました。
        </div>
    </div>
</body>
</html>
    `.trim();

    try {
        // Resend API でメール送信
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Undone Contact <contact@undone.jp>',
                to: ['support@undone.jp'],
                reply_to: email,
                subject: `【お問い合わせ】${category || 'Webサイト'} - ${name}`,
                text: emailBody,
                html: htmlBody
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Resend API error:', errorData);
            throw new Error('Failed to send email');
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'content-type': 'application/json; charset=utf-8' }
        });
    } catch (error) {
        console.error('Email send error:', error);
        return new Response(JSON.stringify({ error: 'Failed to send email' }), {
            status: 500,
            headers: { 'content-type': 'application/json; charset=utf-8' }
        });
    }
}
