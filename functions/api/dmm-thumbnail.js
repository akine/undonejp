export async function onRequestGet(context) {
    const { request } = context;
    const url = new URL(request.url);
    const list = url.searchParams.getAll('urls');
    const raw = url.searchParams.get('urls');
    const urls = (list.length ? list : (raw ? raw.split(',') : []))
        .map((value) => value.trim())
        .filter(Boolean);

    if (!urls.length) {
        return new Response(JSON.stringify({ items: {} }), {
            status: 200,
            headers: { 'content-type': 'application/json; charset=utf-8' }
        });
    }

    const allowHosts = new Set(['tv.dmm.com', 'www.tv.dmm.com']);
    const unique = Array.from(new Set(urls));

    const fetchHtml = async (pageUrl) => {
        try {
            const target = new URL(pageUrl);
            if (!allowHosts.has(target.hostname)) {
                return null;
            }
            const response = await fetch(target.toString(), {
                headers: {
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
                }
            });
            if (!response.ok) {
                return null;
            }
            return response.text();
        } catch (error) {
            return null;
        }
    };

    const extractOgImage = (html) => {
        if (!html) {
            return null;
        }
        const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        if (ogMatch?.[1]) {
            return ogMatch[1];
        }
        const twitterMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
        if (twitterMatch?.[1]) {
            return twitterMatch[1];
        }
        return null;
    };

    try {
        const results = await Promise.all(
            unique.map(async (pageUrl) => {
                const html = await fetchHtml(pageUrl);
                const image = extractOgImage(html);
                return [pageUrl, image];
            })
        );

        const items = {};
        results.forEach(([pageUrl, image]) => {
            if (image) {
                items[pageUrl] = image;
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
