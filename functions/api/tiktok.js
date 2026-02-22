export async function onRequestGet(context) {
    const { request } = context;
    
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
    
    const url = new URL(request.url);
    const list = url.searchParams.getAll('urls');
    const raw = url.searchParams.get('urls');
    const urls = list.length ? list : (raw ? raw.split(',') : [])
        .map((value) => value.trim())
        .filter(Boolean);

    if (!urls.length) {
        return new Response(JSON.stringify({ items: {} }), {
            status: 200,
            headers: { 'content-type': 'application/json; charset=utf-8' }
        });
    }

    const unique = Array.from(new Set(urls));

    try {
        const results = await Promise.all(
            unique.map(async (videoUrl) => {
                try {
                    // SSRF対策: TikTok URLのみ許可
                    const isValidTikTokUrl = (url) => {
                        try {
                            const parsedUrl = new URL(url);
                            // TikTokの正規ホスト名のみ許可
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
                    
                    if (!isValidTikTokUrl(videoUrl)) {
                        return [videoUrl, null];
                    }
                    
                    const params = new URLSearchParams({ url: videoUrl });
                    const apiUrl = `https://www.tiktok.com/oembed?${params.toString()}`;
                    
                    const response = await fetch(apiUrl, {
                        // タイムアウト設定（10秒）
                        signal: AbortSignal.timeout(10000),
                        headers: {
                            'User-Agent': 'undonejp-tiktok-proxy/1.0'
                        }
                    });
                    
                    if (!response.ok) {
                        return [videoUrl, null];
                    }
                    
                    const data = await response.json();
                    return [videoUrl, data.thumbnail_url || null];
                } catch (error) {
                    return [videoUrl, null];
                }
            })
        );

        const items = {};
        results.forEach(([videoUrl, thumbnail]) => {
            if (thumbnail) {
                items[videoUrl] = thumbnail;
            }
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
