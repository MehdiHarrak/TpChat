export const config = {
    runtime: 'nodejs',
};

import PushNotifications from "@pusher/push-notifications-server";
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

async function getConnecterUser(req) {
    let token = req.headers.authorization;
    if (!token) return null;
  
    token = token.replace("Bearer ", "");
    const redis = getRedis();
    const user = await redis.get(token);
    return user;
}

export default async function handler(req, res) {
    try {
        const user = await getConnecterUser(req);
        if (!user) {
            return res.status(401).json({ code: "UNAUTHORIZED", message: "Session expired" });
        }

        const userIDInQueryParam = req.query.user_id;
        
        if (!userIDInQueryParam || userIDInQueryParam !== user.externalId) {
            return res.status(401).json({ code: "UNAUTHORIZED", message: "Session expired" });
        }

        const beamsClient = new PushNotifications({
            instanceId: process.env.PUSHER_INSTANCE_ID,
            secretKey: process.env.PUSHER_SECRET_KEY,
        });

        const beamsToken = beamsClient.generateToken(user.externalId);
        
        return res.json(beamsToken);

    } catch (err) {
        console.error("Erreur beams API:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
