import { sql } from '@vercel/postgres';
import { Redis } from '@upstash/redis';
import {arrayBufferToBase64, stringToArrayBuffer} from "../lib/base64";

export const config = {
    runtime: 'edge',
};

// Initialize Redis - support both UPSTASH and KV (Vercel) environment variables (lazy initialization)
let redisInstance = null;
function getRedis() {
    if (redisInstance) {
        return redisInstance;
    }
    
    const restUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    
    if (!restUrl || !restToken) {
        throw new Error("Redis configuration not found");
    }
    
    const cleanUrl = restUrl.replace(/\/$/, '');
    redisInstance = new Redis({ url: cleanUrl, token: restToken });
    return redisInstance;
}

export default async function handler(request) {
    try {
        const {username, password} = await request.json();
        const hash = await crypto.subtle.digest('SHA-256', stringToArrayBuffer(username + password));
        const hashed64 = arrayBufferToBase64(hash);

        const {rowCount, rows} = await sql`select * from users where username = ${username} and password = ${hashed64}`;
        if (rowCount !== 1) {
            const error = {code: "UNAUTHORIZED", message: "Identifiant ou mot de passe incorrect"};
            return new Response(JSON.stringify(error), {
                status: 401,
                headers: {'content-type': 'application/json'},
            });
        } else {
            await sql`update users set last_login = now() where user_id = ${rows[0].user_id}`;
            const token = crypto.randomUUID().toString();
            const user = {id: rows[0].user_id, username: rows[0].username, email: rows[0].email, externalId: rows[0].external_id}
            const redis = getRedis();
            await redis.set(token, user, { ex: 3600 });
            const userInfo = {};
            userInfo[user.id] = user;
            await redis.hset("users", userInfo);

            return new Response(JSON.stringify({token: token, username: username, externalId: rows[0].external_id, id: rows[0].user_id}), {
                status: 200,
                headers: {'content-type': 'application/json'},
            });
        }
    } catch (error) {
        console.log(error);
        return new Response(JSON.stringify(error), {
            status: 500,
            headers: {'content-type': 'application/json'},
        });
    }
}
