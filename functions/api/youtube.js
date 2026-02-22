export async function onRequestGet(context) {
    const { request, env } = context;
    
    // CSRF対策: Refererヘッダーチェック（GETリクエスト向け）
    const referer = request.headers.get('Referer');
    if (referer) {
        const allowedOrigins = [
            'https://undone.jp',
            'https://www.undone.jp',
            'https://undonejp.pages.dev'
        ];
        
        try {
            const refererUrl = new URL(referer);
            const refererHost = `${refererUrl.protocol}//${refererUrl.host}`;
            if (!allowedOrigins.includes(refererHost)) {
                return new Response(JSON.stringify({ error: 'CSRF: Invalid referer' }), {
                    status: 403,
                    headers: { 'content-type': 'application/json; charset=utf-8' }
                });
            }
        } catch (error) {
            return new Response(JSON.stringify({ error: 'CSRF: Invalid referer format' }), {
                status: 403,
                headers: { 'content-type': 'application/json; charset=utf-8' }
            });
        }
    }
    
    const apiKey = env.YOUTUBE_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Missing API key' }), {
            status: 500,
            headers: { 'content-type': 'application/json; charset=utf-8' }
        });
    }

    const url = new URL(request.url);
    const idsParam = url.searchParams.get('ids') || '';
    // YouTube ID検証（11文字、英数字とアンダースコア・ハイフンのみ）
    const validIdRegex = /^[a-zA-Z0-9_-]{11}$/;
    const ids = idsParam
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .filter(id => {
            if (!validIdRegex.test(id)) {
                console.warn('Invalid YouTube ID format:', id);
                return false;
            }
            return true;
        });

    if (!ids.length) {
        return new Response(JSON.stringify({ items: {} }), {
            status: 200,
            headers: { 'content-type': 'application/json; charset=utf-8' }
        });
    }

    const chunk = (list, size) => {
        const result = [];
        for (let i = 0; i < list.length; i += size) {
            result.push(list.slice(i, i + size));
        }
        return result;
    };

    try {
        const batches = chunk(ids, 50);
        const responses = await Promise.all(
            batches.map(async (batch) => {
                const params = new URLSearchParams({
                    part: 'snippet,contentDetails,statistics',
                    id: batch.join(','),
                    key: apiKey
                });
                const apiUrl = `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`;
                const apiResponse = await fetch(apiUrl);
                if (!apiResponse.ok) {
                    // APIキー漏洩防止: 詳細なエラー情報をログに記録するがレスポンスには含めない
                    console.error('YouTube API error:', {
                        status: apiResponse.status,
                        statusText: apiResponse.statusText,
                        batch: batch.slice(0, 3) // デバッグ用に最初の3IDのみ記録
                    });
                    throw new Error(`YouTube API request failed with status ${apiResponse.status}`);
                }
                return apiResponse.json();
            })
        );

        const items = {};
        responses.forEach((data) => {
            (data.items || []).forEach((item) => {
                items[item.id] = {
                    duration: item.contentDetails?.duration || null,
                    viewCount: item.statistics?.viewCount || null,
                    publishedAt: item.snippet?.publishedAt || null
                };
            });
        });

        return new Response(JSON.stringify({ items }), {
            status: 200,
            headers: {
                'content-type': 'application/json; charset=utf-8',
                'cache-control': 'public, max-age=3600'
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch data' }), {
            status: 500,
            headers: { 'content-type': 'application/json; charset=utf-8' }
        });
    }
}
