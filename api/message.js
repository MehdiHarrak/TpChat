import { sql } from "@vercel/postgres";
import { Redis } from '@upstash/redis';

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

// Edge runtime compatible authentication function
async function getConnecterUser(request) {
    try {
        let token = new Headers(request.headers).get('authorization');
        if (!token) return null;
      
        token = token.replace("Bearer ", "");
        console.log("checking " + token);
      
        const redis = getRedis();
        const user = await redis.get(token);
        if (user) console.log("Got user :", user.username);
        return user;
    } catch (error) {
        console.error("Error in getConnecterUser:", error);
        return null;
    }
}

export default async function handler(request) {
    try {
        console.log("Message API called, method:", request.method);
        
        // Check if the user is authenticated
        const user = await getConnecterUser(request);
        if (!user) {
            console.log("Not connected");
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'content-type': 'application/json' },
            });
        }

        const body = await request.json();
        const { recipient_id, content, room_id } = body;
        
        // Validate required fields
        if (!content) {
            return new Response(JSON.stringify({ error: 'Missing required fields (content)' }), {
                status: 400,
                headers: { 'content-type': 'application/json' },
            });
        }

        // Get sender_id from the authenticated user
        const sender_id = user.id;
        console.log('Authenticated user:', user);
        console.log('Sender ID:', sender_id);
        console.log('Recipient ID:', recipient_id);
        console.log('Room ID:', room_id);
        console.log('Content:', content);

        // Insert message into database
        let rows;
        try {
            console.log("Attempting to insert message into database...");
            console.log("SQL values:", { room_id, sender_id, recipient_id, content });
            
            const result = await sql`
                INSERT INTO messages (room_id, sender_id, recipient_id, content, sent_at)
                VALUES (${room_id || null}, ${sender_id}, ${recipient_id || null}, ${content}, now())
                RETURNING message_id, sent_at
            `;
            
            console.log("SQL result:", result);
            rows = result.rows || result;
            console.log("Rows:", rows);
            console.log(`Message sent by user ${sender_id} to room ${room_id || 'private'}`);
        } catch (dbError) {
            console.error("Database error:", dbError);
            console.error("Database error details:", {
                message: dbError.message,
                stack: dbError.stack,
                code: dbError.code,
                name: dbError.name
            });
            return new Response(JSON.stringify({ 
                error: 'Database error',
                message: dbError.message,
                code: dbError.code
            }), {
                status: 500,
                headers: { 'content-type': 'application/json' },
            });
        }

        if (!rows || rows.length === 0) {
            console.error("No rows returned from INSERT");
            return new Response(JSON.stringify({ error: 'Failed to insert message' }), {
                status: 500,
                headers: { 'content-type': 'application/json' },
            });
        }

        // Note: Push notifications are handled client-side via Pusher Beams
        // We don't send server-side push notifications in Edge runtime
        // The client will receive the message via WebSocket/Pusher channels
        
        return new Response(JSON.stringify({ 
            success: true, 
            message_id: rows[0].message_id,
            sent_at: rows[0].sent_at 
        }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
    } catch (error) {
        console.error("Error in message API:", error);
        console.error("Error details:", {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code
        });
        return new Response(JSON.stringify({ 
            error: 'Internal server error',
            message: error.message,
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
        });
    }
}




