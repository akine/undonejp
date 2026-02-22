/**
 * microCMS API proxy endpoint
 * APIキーをサーバーサイドで保護し、クライアントからの直接アクセスを防ぐ
 */

export async function onRequestGet(context) {
    const { request, env } = context;
    
    // CORS対応
    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://undone.jp',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json; charset=utf-8'
    };
    
    try {
        // リクエストパラメータの取得
        const url = new URL(request.url);
        const limit = url.searchParams.get('limit') || '100';
        
        // limitパラメータの検証（数値、1-100の範囲）
        const limitNum = parseInt(limit, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return new Response(JSON.stringify({ 
                error: 'Invalid limit parameter. Must be between 1 and 100.' 
            }), {
                status: 400,
                headers: corsHeaders
            });
        }
        
        // microCMS APIキー（環境変数から取得）
        const apiKey = env.MICROCMS_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ 
                error: 'API key not configured' 
            }), {
                status: 500,
                headers: corsHeaders
            });
        }
        
        // microCMS API呼び出し
        const microCmsUrl = `https://7ektxje7is.microcms.io/api/v1/productions?limit=${limitNum}`;
        
        const response = await fetch(microCmsUrl, {
            headers: {
                'X-MICROCMS-API-KEY': apiKey,
                'User-Agent': 'undonejp-proxy/1.0'
            }
        });
        
        if (!response.ok) {
            console.error('microCMS API error:', response.status, response.statusText);
            return new Response(JSON.stringify({ 
                error: 'Failed to fetch data from microCMS',
                status: response.status 
            }), {
                status: response.status,
                headers: corsHeaders
            });
        }
        
        const data = await response.json();
        
        // レスポンスを返却
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: corsHeaders
        });
        
    } catch (error) {
        console.error('microCMS proxy error:', error);
        return new Response(JSON.stringify({ 
            error: 'Internal server error' 
        }), {
            status: 500,
            headers: corsHeaders
        });
    }
}

export async function onRequestOptions(context) {
    // CORS preflight対応
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': 'https://undone.jp',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400'
        }
    });
}