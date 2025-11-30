import { sql } from "@vercel/postgres";
import { Redis } from '@upstash/redis';

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

async function getConnecterUser(request) {
    try {
        let token = new Headers(request.headers).get('authorization');
        if (!token) return null;
      
        token = token.replace("Bearer ", "");
        const redis = getRedis();
        const user = await redis.get(token);
        return user;
    } catch (error) {
        console.error("Erreur auth:", error);
        return null;
    }
}

export default async function handler(request) {
    try {
        const user = await getConnecterUser(request);
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'content-type': 'application/json' },
            });
        }

        const body = await request.json();
        const { recipient_id, content, room_id } = body;
        
        if (!content) {
            return new Response(JSON.stringify({ error: 'Missing required fields (content)' }), {
                status: 400,
                headers: { 'content-type': 'application/json' },
            });
        }

        const sender_id = user.id;
        
        let rows;
        try {
            const result = await sql`
                INSERT INTO messages (room_id, sender_id, recipient_id, content, sent_at)
                VALUES (${room_id || null}, ${sender_id}, ${recipient_id || null}, ${content}, now())
                RETURNING message_id, sent_at
            `;
            rows = result.rows || result;
        } catch (dbError) {
            console.error("Erreur base de donnees:", dbError);
            return new Response(JSON.stringify({ 
                error: 'Database error',
                message: dbError.message
            }), {
                status: 500,
                headers: { 'content-type': 'application/json' },
            });
        }

        if (!rows || rows.length === 0) {
            return new Response(JSON.stringify({ error: 'Failed to insert message' }), {
                status: 500,
                headers: { 'content-type': 'application/json' },
            });
        }
        
        return new Response(JSON.stringify({ 
            success: true, 
            message_id: rows[0].message_id,
            sent_at: rows[0].sent_at 
        }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
    } catch (error) {
        console.error("Erreur message API:", error);
        return new Response(JSON.stringify({ 
            error: 'Internal server error',
            message: error.message
        }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
        });
    }
}
