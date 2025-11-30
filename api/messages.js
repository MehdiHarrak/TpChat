import { sql } from "@vercel/postgres";
import { checkSession, unauthorizedResponse, getConnecterUser } from "../lib/session";

export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    try {
        const connected = await checkSession(request);
        if (!connected) {
            return unauthorizedResponse();
        }

        const currentUser = await getConnecterUser(request);
        if (!currentUser) {
            return unauthorizedResponse();
        }
        
        const currentUserId = currentUser.id;
        const url = new URL(request.url);
        const roomId = url.searchParams.get('roomId');
        
        if (!roomId) {
            return new Response(JSON.stringify({ error: 'Room ID is required' }), {
                status: 400,
                headers: { 'content-type': 'application/json' },
            });
        }

        const roomIdInt = parseInt(roomId);
        if (isNaN(roomIdInt)) {
            return new Response(JSON.stringify({ error: 'Invalid room ID' }), {
                status: 400,
                headers: { 'content-type': 'application/json' },
            });
        }

        const { rows } = await sql`
            SELECT 
                m.message_id,
                m.content,
                m.sent_at,
                m.sender_id,
                u.username as sender_name
            FROM messages m
            JOIN users u ON m.sender_id = u.user_id
            WHERE m.room_id = ${roomIdInt}
            ORDER BY m.sent_at ASC
        `;
        
        const formattedMessages = rows.map(msg => ({
            id: msg.message_id.toString(),
            text: msg.content,
            time: new Date(msg.sent_at).toLocaleTimeString(),
            fromMe: msg.sender_id === currentUserId,
            senderName: msg.sender_name
        }));

        return new Response(JSON.stringify(formattedMessages), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
        
    } catch (error) {
        console.error("Erreur messages API:", error);
        return new Response(JSON.stringify({ 
            error: 'Internal server error',
            details: error.message 
        }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
        });
    }
};
