// Slack /jisseki command handler
// Usage: /jisseki <url> <role> [tag] [--featured]

export async function onRequestPost(context) {
    const { request, env } = context;

    // Verify Slack request (optional but recommended)
    const formData = await request.formData();
    const text = formData.get('text') || '';
    const responseUrl = formData.get('response_url');

    // Parse command: /jisseki <url> <role> [tag] [--featured]
    const args = parseArgs(text);

    if (!args.url) {
        return slackResponse('❌ URLを指定してください\n例: `/jisseki https://youtu.be/xxxxx 撮影・編集 ドラマ`');
    }

    if (!args.role) {
        return slackResponse('❌ 担当業務を指定してください\n例: `/jisseki https://youtu.be/xxxxx 撮影・編集 ドラマ`');
    }

    // Respond immediately to Slack (3 second limit)
    const immediateResponse = slackResponse('⏳ 登録中...');

    // Process in background
    context.waitUntil(processAndRespond(args, env, responseUrl));

    return immediateResponse;
}

function parseArgs(text) {
    const parts = text.trim().split(/\s+/);
    const featured = parts.includes('--featured');
    const filteredParts = parts.filter(p => p !== '--featured');

    return {
        url: filteredParts[0] || '',
        role: filteredParts[1] || '',
        tag: filteredParts[2] || '',
        featured
    };
}

async function processAndRespond(args, env, responseUrl) {
    try {
        const result = await registerProduction(args, env);

        // Send delayed response to Slack
        await fetch(responseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                response_type: 'in_channel',
                text: result.success
                    ? `✅ 登録完了!\n*${result.title}*\nプラットフォーム: ${result.platform}\n担当: ${args.role}${args.tag ? `\nタグ: ${args.tag}` : ''}${args.featured ? '\n⭐ Featured' : ''}`
                    : `❌ 登録失敗: ${result.error}`
            })
        });
    } catch (error) {
        await fetch(responseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                response_type: 'ephemeral',
                text: `❌ エラー: ${error.message}`
            })
        });
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
        platform,
        role,
        tag: tag || '',
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

    return { success: true, title, platform };
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
        if (!response.ok) return {};

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
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
        const response = await fetch(oembedUrl);
        if (!response.ok) return {};

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
