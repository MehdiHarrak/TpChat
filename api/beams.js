export const config = {
    runtime: 'nodejs',
};

import PushNotifications from "@pusher/push-notifications-server";
import { Redis } from '@upstash/redis';

// Initialize Redis - support both UPSTASH and KV (Vercel) environment variables
function getRedis() {
    const restUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    
    if (!restUrl || !restToken) {
        throw new Error("Redis configuration not found");
    }
    
    const cleanUrl = restUrl.replace(/\/$/, '');
    return new Redis({ url: cleanUrl, token: restToken });
}

const redis = getRedis();

// Node.js compatible authentication functions
async function getConnecterUser(req) {
    let token = req.headers.authorization;
    if (!token) return null;
  
    token = token.replace("Bearer ", "");
    console.log("checking " + token);
  
    const user = await redis.get(token);
    if (user) console.log("Got user :", user.username);
    return user;
}

export default async function handler(req, res) {
    try {
        // Get the current user directly
        const user = await getConnecterUser(req);
        if (!user) {
            console.log("Not connected");
            return res.status(401).json({ code: "UNAUTHORIZED", message: "Session expired" });
        }

        // Get user_id from query parameters
        const userIDInQueryParam = req.query.user_id;
        
        console.log("PushToken :", userIDInQueryParam, "->", JSON.stringify(user));

        if (!userIDInQueryParam || userIDInQueryParam !== user.externalId) {
            console.log("User ID mismatch or missing");
            return res.status(401).json({ code: "UNAUTHORIZED", message: "Session expired" });
        }

        console.log("Using push instance :", process.env.PUSHER_INSTANCE_ID);

        const beamsClient = new PushNotifications({
            instanceId: process.env.PUSHER_INSTANCE_ID,
            secretKey: process.env.PUSHER_SECRET_KEY,
        });

        const beamsToken = beamsClient.generateToken(user.externalId);
        console.log(JSON.stringify(beamsToken));
        
        return res.json(beamsToken);

    } catch (err) {
        console.error("Error in beams API:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
  