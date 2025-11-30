export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    // Only allow in development or with a secret key
    const secret = request.headers.get('x-debug-secret');
    if (process.env.NODE_ENV === 'production' && secret !== process.env.DEBUG_SECRET) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
        });
    }

    const envInfo = {
        // Check Redis variables
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? '✓ Set' : '✗ Missing',
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? '✓ Set' : '✗ Missing',
        KV_REST_API_URL: process.env.KV_REST_API_URL ? '✓ Set' : '✗ Missing',
        KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? '✓ Set' : '✗ Missing',
        
        // Check Pusher variables
        PUSHER_INSTANCE_ID: process.env.PUSHER_INSTANCE_ID ? '✓ Set' : '✗ Missing',
        PUSHER_SECRET_KEY: process.env.PUSHER_SECRET_KEY ? '✓ Set' : '✗ Missing',
        
        // Environment
        NODE_ENV: process.env.NODE_ENV || 'Not set',
        VERCEL: process.env.VERCEL ? '✓ Yes' : '✗ No',
        
        // Partial values for debugging (first 10 chars only)
        KV_REST_API_URL_PARTIAL: process.env.KV_REST_API_URL ? process.env.KV_REST_API_URL.substring(0, 20) + '...' : 'N/A',
    };

    return new Response(JSON.stringify(envInfo, null, 2), {
        status: 200,
        headers: { 'content-type': 'application/json' },
    });
}

