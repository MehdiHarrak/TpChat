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
    
    try {
        const restUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
        const restToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
        
        if (!restUrl || !restToken) {
            const errorMsg = `Redis configuration not found. UPSTASH_REDIS_REST_URL: ${!!process.env.UPSTASH_REDIS_REST_URL}, KV_REST_API_URL: ${!!process.env.KV_REST_API_URL}`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        
        const cleanUrl = restUrl.replace(/\/$/, '');
        redisInstance = new Redis({ url: cleanUrl, token: restToken });
        return redisInstance;
    } catch (error) {
        console.error("Failed to initialize Redis:", error);
        throw error;
    }
}

export default async function handler(request) {
    try {
        console.log("Login API called");
        const body = await request.json();
        const {username, password} = body;
        
        if (!username || !password) {
            console.error("Missing username or password");
            return new Response(JSON.stringify({code: "MISSING_FIELDS", message: "Username and password are required"}), {
                status: 400,
                headers: {'content-type': 'application/json'},
            });
        }
        
        console.log("Attempting login for username/email:", username);
        
        // First, find the user by username OR email (without password check)
        // This allows users to login with either their username or email
        const {rowCount: userCount, rows: userRows} = await sql`
            SELECT * FROM users 
            WHERE username = ${username} OR email = ${username}
        `;
        console.log("User lookup result - rowCount:", userCount);
        
        if (userCount === 0) {
            console.log("User not found");
            const error = {code: "UNAUTHORIZED", message: "Identifiant ou mot de passe incorrect"};
            return new Response(JSON.stringify(error), {
                status: 401,
                headers: {'content-type': 'application/json'},
            });
        }
        
        // Use the actual username from database to calculate hash (not the input)
        // This ensures the hash matches what was stored during signup
        const actualUsername = userRows[0].username;
        console.log("Found user with username:", actualUsername);
        
        const hash = await crypto.subtle.digest('SHA-256', stringToArrayBuffer(actualUsername + password));
        const hashed64 = arrayBufferToBase64(hash);
        console.log("Password hash calculated with actual username");

        // Now verify the password hash matches
        if (userRows[0].password !== hashed64) {
            console.log("Password hash does not match");
            const error = {code: "UNAUTHORIZED", message: "Identifiant ou mot de passe incorrect"};
            return new Response(JSON.stringify(error), {
                status: 401,
                headers: {'content-type': 'application/json'},
            });
        }
        
        const rows = userRows;
        const rowCount = userCount;
        console.log("Password verified successfully");
        
        if (rowCount !== 1) {
            console.log("Login failed - user not found or password incorrect");
            const error = {code: "UNAUTHORIZED", message: "Identifiant ou mot de passe incorrect"};
            return new Response(JSON.stringify(error), {
                status: 401,
                headers: {'content-type': 'application/json'},
            });
        } else {
            console.log("User found, updating last_login");
            await sql`update users set last_login = now() where user_id = ${rows[0].user_id}`;
            const token = crypto.randomUUID().toString();
            const user = {id: rows[0].user_id, username: rows[0].username, email: rows[0].email, externalId: rows[0].external_id}
            
            console.log("Storing session in Redis");
            try {
                const redis = getRedis();
                if (!redis) {
                    console.warn("Redis not available, continuing without session storage");
                } else {
                    await redis.set(token, user, { ex: 3600 });
                    const userInfo = {};
                    userInfo[user.id] = user;
                    await redis.hset("users", userInfo);
                    console.log("Session stored in Redis successfully");
                }
            } catch (redisError) {
                console.error("Redis error during login:", redisError);
                console.error("Redis error details:", {
                    message: redisError.message,
                    stack: redisError.stack
                });
                // Still return success but log the error
                // The user can still login, but session won't be stored in Redis
                console.warn("Continuing login without Redis session storage");
            }

            console.log("Login successful, returning token");
            return new Response(JSON.stringify({token: token, username: username, externalId: rows[0].external_id, id: rows[0].user_id}), {
                status: 200,
                headers: {'content-type': 'application/json'},
            });
        }
    } catch (error) {
        console.error("Login API error:", error);
        console.error("Error details:", {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        return new Response(JSON.stringify({
            code: "INTERNAL_ERROR",
            message: error.message || "An error occurred during login"
        }), {
            status: 500,
            headers: {'content-type': 'application/json'},
        });
    }
}
