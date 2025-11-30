import { Redis } from '@upstash/redis';

// Helper function to initialize Redis
function getRedis() {
    // Get Redis connection details - support both UPSTASH and KV (Vercel) variables
    const restUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    
    if (!restUrl || !restToken) {
        throw new Error("Redis configuration not found. Need UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN or KV_REST_API_URL/KV_REST_API_TOKEN");
    }
    
    // Ensure URL doesn't have trailing slash
    const cleanUrl = restUrl.replace(/\/$/, '');
    
    return new Redis({ 
        url: cleanUrl, 
        token: restToken 
    });
}

// Initialize Redis at module level for Edge runtime
const redis = getRedis();

export async function getConnecterUser(request) {
    let token = new Headers(request.headers).get('authorization');
    if (token === undefined || token === null || token === "") {
        return null;
    } else {
        token = token.replace("Bearer ", "");
    }
    console.log("checking " + token);
    const user = await redis.get(token);
    if (user) {
        console.log("Got user : " + user.username);
    } else {
        console.log("No user found for token");
    }
    return user;
}

export async function checkSession(request) {
    const user = await getConnecterUser(request);
    // console.log(user);
    return (user !== undefined && user !== null && user);
}

export function unauthorizedResponse() {
    const error = {code: "UNAUTHORIZED", message: "Session expired"};
    return new Response(JSON.stringify(error), {
        status: 401,
        headers: {'content-type': 'application/json'},
    });
}

export function triggerNotConnected(res) {
    res.status(401).json("{code: \"UNAUTHORIZED\", message: \"Session expired\"}");
}