export async function onRequestGet(context) {
    const { request } = context;
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
                    const params = new URLSearchParams({ url: videoUrl });
                    const apiUrl = `https://www.tiktok.com/oembed?${params.toString()}`;
                    const response = await fetch(apiUrl);
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
