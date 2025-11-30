import { sql } from '@vercel/postgres';
import { Redis } from '@upstash/redis';
import {arrayBufferToBase64, stringToArrayBuffer} from "../lib/base64";

export const config = {
    runtime: 'edge',
};

// Helper function to initialize Redis (lazy initialization with caching)
let redisInstance = null;
function getRedis() {
    if (redisInstance) {
        return redisInstance;
    }
    
    // Get Redis connection details - support both UPSTASH and KV (Vercel) variables
    const restUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    
    if (!restUrl || !restToken) {
        throw new Error("Redis configuration not found. Need UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN or KV_REST_API_URL/KV_REST_API_TOKEN");
    }
    
    // Ensure URL doesn't have trailing slash and is properly formatted
    const cleanUrl = restUrl.replace(/\/$/, '');
    
    // Create Redis client with explicit configuration
    redisInstance = new Redis({ 
        url: cleanUrl, 
        token: restToken 
    });
    
    return redisInstance;
}

export default async function handler(request) {
    try {
        // Initialize Redis inside handler to ensure env vars are available
        const redis = getRedis();
        
        // Debug logging (in development only)
        if (process.env.NODE_ENV === 'development') {
            const restUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
            console.log("Redis URL:", restUrl ? `${restUrl.substring(0, 30)}...` : "Not set");
            console.log("Redis Token:", (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN) ? "Set" : "Not set");
        }
        
        if (!redis) {
            const error = {
                code: "REDIS_NOT_CONFIGURED",
                message: "Redis is not properly configured. Please check UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN or KV_REST_API_URL/KV_REST_API_TOKEN environment variables."
            };
            console.error("Redis not initialized. Check environment variables:");
            console.error("UPSTASH_REDIS_REST_URL:", process.env.UPSTASH_REDIS_REST_URL ? "✓ Set" : "✗ Missing");
            console.error("UPSTASH_REDIS_REST_TOKEN:", process.env.UPSTASH_REDIS_REST_TOKEN ? "✓ Set" : "✗ Missing");
            console.error("KV_REST_API_URL:", process.env.KV_REST_API_URL ? "✓ Set" : "✗ Missing");
            console.error("KV_REST_API_TOKEN:", process.env.KV_REST_API_TOKEN ? "✓ Set" : "✗ Missing");
            return new Response(JSON.stringify(error), {
                status: 500,
                headers: {'content-type': 'application/json'},
            });
        }
        const {username, email, password} = await request.json();
        
        // Validate required fields
        if (!username || !email || !password) {
            const error = {code: "MISSING_FIELDS", message: "Tous les champs sont requis"};
            return new Response(JSON.stringify(error), {
                status: 400,
                headers: {'content-type': 'application/json'},
            });
        }

        // Check if username already exists
        const {rowCount: usernameExists} = await sql`
            SELECT user_id FROM users WHERE username = ${username}
        `;
        
        if (usernameExists > 0) {
            const error = {code: "USERNAME_EXISTS", message: "Ce nom d'utilisateur existe déjà"};
            return new Response(JSON.stringify(error), {
                status: 409,
                headers: {'content-type': 'application/json'},
            });
        }

        // Check if email already exists
        const {rowCount: emailExists} = await sql`
            SELECT user_id FROM users WHERE email = ${email}
        `;
        
        if (emailExists > 0) {
            const error = {code: "EMAIL_EXISTS", message: "Cet email existe déjà"};
            return new Response(JSON.stringify(error), {
                status: 409,
                headers: {'content-type': 'application/json'},
            });
        }

        // Hash the password
        const hash = await crypto.subtle.digest('SHA-256', stringToArrayBuffer(username + password));
        const hashed64 = arrayBufferToBase64(hash);

        // Generate external ID
        const externalId = crypto.randomUUID().toString();

        // Insert new user into database
        const {rows} = await sql`
            INSERT INTO users (username, password, email, created_on, external_id)
            VALUES (${username}, ${hashed64}, ${email}, now(), ${externalId})
            RETURNING user_id, username, email, external_id
        `;

        // Create session token
        const token = crypto.randomUUID().toString();
        const user = {
            id: rows[0].user_id, 
            username: rows[0].username, 
            email: rows[0].email, 
            externalId: rows[0].external_id
        };
        
        // Store session in Redis
        try {
            await redis.set(token, user, { ex: 3600 });
            const userInfo = {};
            userInfo[user.id] = user;
            await redis.hset("users", userInfo);
        } catch (redisError) {
            console.error("Redis operation error:", redisError);
            console.error("Redis URL:", process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL);
            throw new Error(`Failed to store session in Redis: ${redisError.message}`);
        }

        console.log(`New user registered: ${username} (ID: ${user.id})`);

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
        console.error("Signup error:", error);
        console.error("Error message:", error?.message);
        console.error("Error stack:", error?.stack);
        return new Response(JSON.stringify({
            code: "INTERNAL_ERROR",
            message: error?.message || "An error occurred during signup",
            error: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        }), {
            status: 500,
            headers: {'content-type': 'application/json'},
        });
    }
}
