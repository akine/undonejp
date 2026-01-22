export async function onRequestGet(context) {
    const { request, env } = context;
    const apiKey = env.YOUTUBE_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Missing API key' }), {
            status: 500,
            headers: { 'content-type': 'application/json; charset=utf-8' }
        });
    }

    const url = new URL(request.url);
    const idsParam = url.searchParams.get('ids') || '';
    const ids = idsParam
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

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
                    throw new Error('YouTube API error');
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
