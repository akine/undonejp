// Slack /jisseki command handler with Modal UI
// Usage: /jisseki -> Opens modal for easy input

const TAG_OPTIONS = [
    { text: 'ドラマ', value: 'Drama Series' },
    { text: 'バラエティ', value: 'Entertainment' },
    { text: 'Shorts', value: 'Shorts' },
    { text: 'MV', value: 'MV' },
    { text: '企業VP', value: 'Corporate' }
];

// Slack署名検証関数
const verifySlackSignature = async (request, signingSecret, rawBody) => {
    const signature = request.headers.get('x-slack-signature');
    const timestamp = request.headers.get('x-slack-request-timestamp');
    
    if (!signature || !timestamp || !signingSecret) {
        return false;
    }
    
    // タイムスタンプ検証（リプレイ攻撃防止: 5分以内）
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
        return false;
    }
    
    // Slack署名の検証
    try {
        const baseString = `v0:${timestamp}:${rawBody}`;
        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(signingSecret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        
        const hash = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(baseString));
        const expectedSignature = `v0=${Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')}`;
        
        return signature === expectedSignature;
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
};

export async function onRequestPost(context) {
    const { request, env } = context;
    
    // CSRF対策: OriginヘッダーチェックはSlackからの呼び出しの場合は除外
    // ただし、Slack以外からの直接呼び出しは制限する
    const origin = request.headers.get('Origin');
    const userAgent = request.headers.get('User-Agent') || '';
    const slackSignature = request.headers.get('x-slack-signature');
    
    // Slackからの呼び出しでない場合のみOriginチェック
    if (!slackSignature && origin) {
        const allowedOrigins = [
            'https://undone.jp',
            'https://www.undone.jp',
            'https://undonejp.pages.dev'
        ];
        
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
    
    // Slack署名検証（認証バイパス対策）
    const signingSecret = env.SLACK_SIGNING_SECRET;
    if (!signingSecret) {
        return new Response(JSON.stringify({ error: 'Server configuration error: SLACK_SIGNING_SECRET not set' }), {
            status: 500,
            headers: { 'content-type': 'application/json; charset=utf-8' }
        });
    }
    
    // リクエストボディを一度読み取り（署名検証とパース両方で使用）
    const rawBody = await request.text();
    const isValidSignature = await verifySlackSignature(request, signingSecret, rawBody);
    
    if (!isValidSignature) {
        return new Response(JSON.stringify({ error: 'Invalid Slack signature' }), {
            status: 403,
            headers: { 'content-type': 'application/json; charset=utf-8' }
        });
    }
    
    const contentType = request.headers.get('content-type') || '';

    // Parse request body from rawBody
    let body;
    try {
        if (contentType.includes('application/x-www-form-urlencoded')) {
            const params = new URLSearchParams(rawBody);
            body = Object.fromEntries(params.entries());
        } else {
            body = JSON.parse(rawBody);
        }
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid request body' }), {
            status: 400,
            headers: { 'content-type': 'application/json; charset=utf-8' }
        });
    }

    // Check if this is an interaction (modal submission or button click)
    if (body.payload) {
        let payload;
        try {
            payload = JSON.parse(body.payload);
        } catch (error) {
            console.error('Invalid JSON in payload:', error.message);
            return new Response(JSON.stringify({ error: 'Invalid payload format' }), {
                status: 400,
                headers: { 'content-type': 'application/json; charset=utf-8' }
            });
        }

        if (payload.type === 'view_submission') {
            return handleModalSubmission(payload, env);
        }

        if (payload.type === 'block_actions') {
            return handleBlockActions(payload, env);
        }

        // Unknown interaction type
        return new Response(JSON.stringify({ response_action: 'clear' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // This is a slash command - open modal
    const triggerId = body.trigger_id;

    if (!triggerId) {
        return slackResponse('❌ trigger_id が取得できませんでした');
    }

    if (!env.SLACK_BOT_TOKEN) {
        return slackResponse('❌ SLACK_BOT_TOKEN が設定されていません');
    }

    // Open modal
    const modalOpened = await openModal(triggerId, env.SLACK_BOT_TOKEN);

    if (!modalOpened.ok) {
        return slackResponse(`❌ モーダルを開けませんでした: ${modalOpened.error}`);
    }

    // Return empty 200 to acknowledge command
    return new Response('', { status: 200 });
}

async function openModal(triggerId, botToken) {
    const modal = {
        type: 'modal',
        callback_id: 'jisseki_modal',
        title: {
            type: 'plain_text',
            text: '実績登録'
        },
        submit: {
            type: 'plain_text',
            text: '登録'
        },
        close: {
            type: 'plain_text',
            text: 'キャンセル'
        },
        blocks: [
            {
                type: 'input',
                block_id: 'url_block',
                label: {
                    type: 'plain_text',
                    text: 'URL'
                },
                element: {
                    type: 'plain_text_input',
                    action_id: 'url_input',
                    placeholder: {
                        type: 'plain_text',
                        text: 'https://youtu.be/xxxxx'
                    }
                }
            },
            {
                type: 'input',
                block_id: 'role_block',
                label: {
                    type: 'plain_text',
                    text: '担当業務'
                },
                element: {
                    type: 'plain_text_input',
                    action_id: 'role_input',
                    placeholder: {
                        type: 'plain_text',
                        text: '撮影・編集'
                    }
                }
            },
            {
                type: 'input',
                block_id: 'tag_block',
                label: {
                    type: 'plain_text',
                    text: 'カテゴリ'
                },
                element: {
                    type: 'static_select',
                    action_id: 'tag_select',
                    placeholder: {
                        type: 'plain_text',
                        text: '選択してください'
                    },
                    options: TAG_OPTIONS.map(opt => ({
                        text: {
                            type: 'plain_text',
                            text: opt.text
                        },
                        value: opt.value
                    }))
                }
            },
            {
                type: 'input',
                block_id: 'featured_block',
                optional: true,
                label: {
                    type: 'plain_text',
                    text: 'オプション'
                },
                element: {
                    type: 'checkboxes',
                    action_id: 'featured_checkbox',
                    options: [
                        {
                            text: {
                                type: 'plain_text',
                                text: '⭐ Featured（トップに表示）'
                            },
                            value: 'featured'
                        }
                    ]
                }
            }
        ]
    };

    const response = await fetch('https://slack.com/api/views.open', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${botToken}`
        },
        body: JSON.stringify({
            trigger_id: triggerId,
            view: modal
        })
    });

    return response.json();
}

async function handleModalSubmission(payload, env) {
    const values = payload.view.state.values;

    const url = values.url_block?.url_input?.value || '';
    const role = values.role_block?.role_input?.value || '';
    const tag = values.tag_block?.tag_select?.selected_option?.value || '';
    const featuredOptions = values.featured_block?.featured_checkbox?.selected_options || [];
    const featured = featuredOptions.some(opt => opt.value === 'featured');

    // Validate
    if (!url) {
        return modalError('url_block', 'URLを入力してください');
    }
    if (!role) {
        return modalError('role_block', '担当業務を入力してください');
    }
    if (!tag) {
        return modalError('tag_block', 'カテゴリを選択してください');
    }

    // Register in background and close modal immediately
    const userId = payload.user?.id;

    // We need to close modal first, then send result via chat
    // Use waitUntil pattern with context - but we don't have context here
    // Instead, we'll process synchronously but quickly

    try {
        const result = await registerProduction({ url, role, tag, featured }, env);

        // Send result to user via DM or channel
        if (userId && env.SLACK_BOT_TOKEN) {
            const tagLabel = TAG_OPTIONS.find(t => t.value === tag)?.text || tag;

            if (result.success) {
                const message = `✅ 登録完了!\n*${result.title}*\nプラットフォーム: ${result.platform}\n担当: ${role}\nカテゴリ: ${tagLabel}${featured ? '\n⭐ Featured' : ''}`;
                await sendDirectMessageWithDeleteButton(userId, message, result.id, result.title, env.SLACK_BOT_TOKEN);
            } else {
                await sendDirectMessage(userId, `❌ 登録失敗: ${result.error}`, env.SLACK_BOT_TOKEN);
            }
        }

        // Close modal
        return new Response(JSON.stringify({ response_action: 'clear' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        // Send error to user
        if (userId && env.SLACK_BOT_TOKEN) {
            await sendDirectMessage(userId, `❌ エラー: ${error.message}`, env.SLACK_BOT_TOKEN);
        }

        return new Response(JSON.stringify({ response_action: 'clear' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

function modalError(blockId, message) {
    return new Response(JSON.stringify({
        response_action: 'errors',
        errors: {
            [blockId]: message
        }
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

async function sendDirectMessage(userId, text, botToken) {
    try {
        // Open DM channel
        const openResponse = await fetch('https://slack.com/api/conversations.open', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${botToken}`
            },
            body: JSON.stringify({ users: userId })
        });

        const openData = await openResponse.json();
        if (!openData.ok) return;

        const channelId = openData.channel?.id;
        if (!channelId) return;

        // Send message
        await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${botToken}`
            },
            body: JSON.stringify({
                channel: channelId,
                text
            })
        });
    } catch {
        // Ignore DM errors
    }
}

async function sendDirectMessageWithDeleteButton(userId, text, contentId, title, botToken) {
    try {
        // Open DM channel
        const openResponse = await fetch('https://slack.com/api/conversations.open', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${botToken}`
            },
            body: JSON.stringify({ users: userId })
        });

        const openData = await openResponse.json();
        if (!openData.ok) return;

        const channelId = openData.channel?.id;
        if (!channelId) return;

        // Send message with delete button
        await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${botToken}`
            },
            body: JSON.stringify({
                channel: channelId,
                text,
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text
                        }
                    },
                    {
                        type: 'actions',
                        elements: [
                            {
                                type: 'button',
                                text: {
                                    type: 'plain_text',
                                    text: '🗑️ 取り消す',
                                    emoji: true
                                },
                                style: 'danger',
                                action_id: 'delete_production',
                                value: JSON.stringify({ id: contentId, title })
                            }
                        ]
                    }
                ]
            })
        });
    } catch {
        // Ignore DM errors
    }
}

async function handleBlockActions(payload, env) {
    const action = payload.actions?.[0];

    if (action?.action_id === 'delete_production') {
        let id, title;
        try {
            ({ id, title } = JSON.parse(action.value));
        } catch (error) {
            console.error('Invalid JSON in action value:', error.message);
            return new Response(JSON.stringify({ error: 'Invalid action data' }), {
                status: 400,
                headers: { 'content-type': 'application/json; charset=utf-8' }
            });
        }
        const userId = payload.user?.id;
        const channelId = payload.channel?.id;
        const messageTs = payload.message?.ts;

        // Delete from microCMS
        const deleteResult = await deleteProduction(id, env);

        if (deleteResult.success) {
            // Update message to show deleted
            if (channelId && messageTs && env.SLACK_BOT_TOKEN) {
                await fetch('https://slack.com/api/chat.update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${env.SLACK_BOT_TOKEN}`
                    },
                    body: JSON.stringify({
                        channel: channelId,
                        ts: messageTs,
                        text: `🗑️ 削除しました\n~${title}~`,
                        blocks: [
                            {
                                type: 'section',
                                text: {
                                    type: 'mrkdwn',
                                    text: `🗑️ 削除しました\n~*${title}*~`
                                }
                            }
                        ]
                    })
                });
            }
        } else {
            // Send error message
            if (userId && env.SLACK_BOT_TOKEN) {
                await sendDirectMessage(userId, `❌ 削除失敗: ${deleteResult.error}`, env.SLACK_BOT_TOKEN);
            }
        }
    }

    // Acknowledge the action
    return new Response('', { status: 200 });
}

async function deleteProduction(contentId, env) {
    const microCmsKey = env.MICROCMS_WRITE_KEY;
    if (!microCmsKey) {
        return { success: false, error: 'MICROCMS_WRITE_KEY not configured' };
    }

    try {
        const response = await fetch(`https://7ektxje7is.microcms.io/api/v1/productions/${contentId}`, {
            method: 'DELETE',
            headers: {
                'X-MICROCMS-API-KEY': microCmsKey
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { success: false, error: `microCMS error: ${response.status} ${errorText}` };
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function registerProduction(args, env) {
    const { url, role, tag, featured } = args;

    // Detect platform from URL
    const platform = detectPlatform(url);

    // Fetch video details
    let title = '';
    let releaseDate = '';

    if (platform === 'YouTube') {
        const videoId = getYouTubeId(url);
        if (videoId && env.YOUTUBE_API_KEY) {
            const details = await fetchYouTubeDetails(videoId, env.YOUTUBE_API_KEY);
            title = details.title || '';
            releaseDate = details.publishedAt || '';
        }
    } else if (platform === 'TikTok') {
        const details = await fetchTikTokDetails(url);
        title = details.title || '';
    }

    // If no title found, use URL as fallback
    if (!title) {
        title = `新規作品 - ${platform}`;
    }

    // Post to microCMS
    const microCmsKey = env.MICROCMS_WRITE_KEY;
    if (!microCmsKey) {
        return { success: false, error: 'MICROCMS_WRITE_KEY not configured' };
    }

    const payload = {
        title,
        url,
        platform: [platform],
        role,
        tag: [tag],
        featured: featured || false,
        releaseDate: releaseDate || '',
        sortOrder: 0
    };

    const response = await fetch('https://7ektxje7is.microcms.io/api/v1/productions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-MICROCMS-API-KEY': microCmsKey
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `microCMS error: ${response.status} ${errorText}` };
    }

    const result = await response.json();
    return { success: true, title, platform, id: result.id };
}

function detectPlatform(url) {
    if (!url) return 'その他';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
    if (url.includes('tiktok.com')) return 'TikTok';
    if (url.includes('dmm.com') || url.includes('dmm.co.jp')) return 'DMM TV';
    return 'その他';
}

function getYouTubeId(url) {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        if (parsed.hostname.includes('youtu.be')) {
            return parsed.pathname.replace('/', '') || null;
        }
        if (parsed.hostname.includes('youtube.com')) {
            if (parsed.searchParams.get('v')) {
                return parsed.searchParams.get('v');
            }
            if (parsed.pathname.startsWith('/shorts/')) {
                return parsed.pathname.split('/shorts/')[1]?.split('/')[0] || null;
            }
        }
    } catch {
        return null;
    }
    return null;
}

async function fetchYouTubeDetails(videoId, apiKey) {
    try {
        const params = new URLSearchParams({
            part: 'snippet',
            id: videoId,
            key: apiKey
        });
        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
        if (!response.ok) {
            // APIキー漏洩防止: 詳細エラーをログのみに記録
            console.error('YouTube API error in slack-jisseki:', {
                status: response.status,
                statusText: response.statusText,
                videoId: videoId.slice(0, 5) + '...' // 部分的なIDのみログ
            });
            return {};
        }

        const data = await response.json();
        const item = data.items?.[0];
        if (!item) return {};

        return {
            title: item.snippet?.title || '',
            publishedAt: item.snippet?.publishedAt || ''
        };
    } catch {
        return {};
    }
}

async function fetchTikTokDetails(url) {
    try {
        // SSRF対策: TikTok URLのバリデーション
        const isValidTikTokUrl = (url) => {
            try {
                const parsedUrl = new URL(url);
                const allowedHosts = new Set([
                    'www.tiktok.com',
                    'tiktok.com',
                    'm.tiktok.com',
                    'vm.tiktok.com'
                ]);
                
                // HTTPSのみ許可
                if (parsedUrl.protocol !== 'https:') {
                    return false;
                }
                
                // ホスト名チェック
                if (!allowedHosts.has(parsedUrl.hostname.toLowerCase())) {
                    return false;
                }
                
                // プライベートIPアドレス範囲への攻撃を防ぐ
                const ipRegex = /^\d+\.\d+\.\d+\.\d+$/;
                if (ipRegex.test(parsedUrl.hostname)) {
                    return false;
                }
                
                return true;
            } catch {
                return false;
            }
        };
        
        if (!isValidTikTokUrl(url)) {
            console.warn('Invalid TikTok URL blocked:', url.slice(0, 50) + '...');
            return {};
        }
        
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
        const response = await fetch(oembedUrl, {
            // タイムアウト設定（10秒）
            signal: AbortSignal.timeout(10000),
            headers: {
                'User-Agent': 'undonejp-slack-proxy/1.0'
            }
        });
        
        if (!response.ok) {
            console.error('TikTok oEmbed API error:', response.status);
            return {};
        }

        const data = await response.json();
        return {
            title: data.title || ''
        };
    } catch {
        return {};
    }
}

function slackResponse(text, inChannel = false) {
    return new Response(JSON.stringify({
        response_type: inChannel ? 'in_channel' : 'ephemeral',
        text
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}
