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
        const redis = getRedis();
        
        if (!redis) {
            return new Response(JSON.stringify({
                code: "REDIS_NOT_CONFIGURED",
                message: "Redis pas configure"
            }), {
                status: 500,
                headers: {'content-type': 'application/json'},
            });
        }
        
        const {username, email, password} = await request.json();
        
        if (!username || !email || !password) {
            const error = {code: "MISSING_FIELDS", message: "Tous les champs sont requis"};
            return new Response(JSON.stringify(error), {
                status: 400,
                headers: {'content-type': 'application/json'},
            });
        }

        const {rowCount: usernameExists} = await sql`
            SELECT user_id FROM users WHERE username = ${username}
        `;
        
        if (usernameExists > 0) {
            const error = {code: "USERNAME_EXISTS", message: "Ce nom d'utilisateur existe deja"};
            return new Response(JSON.stringify(error), {
                status: 409,
                headers: {'content-type': 'application/json'},
            });
        }

        const {rowCount: emailExists} = await sql`
            SELECT user_id FROM users WHERE email = ${email}
        `;
        
        if (emailExists > 0) {
            const error = {code: "EMAIL_EXISTS", message: "Cet email existe deja"};
            return new Response(JSON.stringify(error), {
                status: 409,
                headers: {'content-type': 'application/json'},
            });
        }

        const hash = await crypto.subtle.digest('SHA-256', stringToArrayBuffer(username + password));
        const hashed64 = arrayBufferToBase64(hash);
        const externalId = crypto.randomUUID().toString();

        const {rows} = await sql`
            INSERT INTO users (username, password, email, created_on, external_id)
            VALUES (${username}, ${hashed64}, ${email}, now(), ${externalId})
            RETURNING user_id, username, email, external_id
        `;

        const token = crypto.randomUUID().toString();
        const user = {
            id: rows[0].user_id, 
            username: rows[0].username, 
            email: rows[0].email, 
            externalId: rows[0].external_id
        };
        
        try {
            await redis.set(token, user, { ex: 3600 });
            const userInfo = {};
            userInfo[user.id] = user;
            await redis.hset("users", userInfo);
        } catch (redisError) {
            console.error("Erreur Redis:", redisError);
            throw new Error(`Erreur Redis: ${redisError.message}`);
        }

        return new Response(JSON.stringify({
            token: token, 
            username: username, 
            email: email,
            externalId: externalId, 
            id: user.id
        }), {
            status: 200,
            headers: {'content-type': 'application/json'},
        });
    } catch (error) {
        console.error("Erreur signup:", error);
        return new Response(JSON.stringify({
            code: "INTERNAL_ERROR",
            message: error?.message || "Erreur serveur"
        }), {
            status: 500,
            headers: {'content-type': 'application/json'},
        });
    }
}
