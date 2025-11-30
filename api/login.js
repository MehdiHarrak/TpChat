import { sql } from '@vercel/postgres';
import { Redis } from '@upstash/redis';
import {arrayBufferToBase64, stringToArrayBuffer} from "../lib/base64";

export const config = {
    runtime: 'edge',
};

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

export default async function handler(request) {
    try {
        const body = await request.json();
        const {username, password} = body;
        
        if (!username || !password) {
            return new Response(JSON.stringify({code: "MISSING_FIELDS", message: "Username and password are required"}), {
                status: 400,
                headers: {'content-type': 'application/json'},
            });
        }
        
        const {rowCount: userCount, rows: userRows} = await sql`
            SELECT * FROM users 
            WHERE username = ${username} OR email = ${username}
        `;
        
        if (userCount === 0) {
            const error = {code: "UNAUTHORIZED", message: "Identifiant ou mot de passe incorrect"};
            return new Response(JSON.stringify(error), {
                status: 401,
                headers: {'content-type': 'application/json'},
            });
        }
        
        const actualUsername = userRows[0].username;
        const hash = await crypto.subtle.digest('SHA-256', stringToArrayBuffer(actualUsername + password));
        const hashed64 = arrayBufferToBase64(hash);

        if (userRows[0].password !== hashed64) {
            const error = {code: "UNAUTHORIZED", message: "Identifiant ou mot de passe incorrect"};
            return new Response(JSON.stringify(error), {
                status: 401,
                headers: {'content-type': 'application/json'},
            });
        }
        
        await sql`update users set last_login = now() where user_id = ${userRows[0].user_id}`;
        const token = crypto.randomUUID().toString();
        const user = {id: userRows[0].user_id, username: userRows[0].username, email: userRows[0].email, externalId: userRows[0].external_id}
        
        try {
            const redis = getRedis();
            await redis.set(token, user, { ex: 3600 });
            const userInfo = {};
            userInfo[user.id] = user;
            await redis.hset("users", userInfo);
        } catch (redisError) {
            console.error("Erreur Redis:", redisError);
        }

        return new Response(JSON.stringify({token: token, username: userRows[0].username, externalId: userRows[0].external_id, id: userRows[0].user_id}), {
            status: 200,
            headers: {'content-type': 'application/json'},
        });
    } catch (error) {
        console.error("Erreur login:", error);
        return new Response(JSON.stringify({
            code: "INTERNAL_ERROR",
            message: error.message || "Erreur serveur"
        }), {
            status: 500,
            headers: {'content-type': 'application/json'},
        });
    }
}
