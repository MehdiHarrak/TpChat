import { Redis } from '@upstash/redis';

let redisInstance = null;
function getRedis() {
    if (redisInstance) {
        return redisInstance;
    }
    
    try {
        const restUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
        const restToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
        
        if (!restUrl || !restToken) {
            throw new Error("Redis pas configure");
        }
        
        const cleanUrl = restUrl.replace(/\/$/, '');
        redisInstance = new Redis({ url: cleanUrl, token: restToken });
        return redisInstance;
    } catch (error) {
        console.error("Erreur Redis:", error);
        throw error;
    }
}

export async function getConnecterUser(request) {
    try {
        let token = new Headers(request.headers).get('authorization');
        if (token === undefined || token === null || token === "") {
            return null;
        } else {
            token = token.replace("Bearer ", "");
        }
        const redis = getRedis();
        const user = await redis.get(token);
        return user;
    } catch (error) {
        console.error("Erreur auth:", error);
        return null;
    }
}

export async function checkSession(request) {
    const user = await getConnecterUser(request);
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
