import { sql } from "@vercel/postgres";
import { checkSession, unauthorizedResponse, getConnecterUser } from "../lib/session";

export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    try {
        console.log('Messages API called');
        
        // Check if the user is authenticated
        const connected = await checkSession(request);
        if (!connected) {
            console.log("Not connected");
            return unauthorizedResponse();
        }

        // Get the current user
        const currentUser = await getConnecterUser(request);
        if (!currentUser) {
            console.log("No user found in session");
            return unauthorizedResponse();
        }
        
        const currentUserId = currentUser.id;
        console.log(`Current user ID: ${currentUserId}`);

        // Extract room_id from query parameters
        const url = new URL(request.url);
        const roomId = url.searchParams.get('roomId');
        
        console.log('Room ID from query:', roomId);
        
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

        console.log(`Fetching messages for room: ${roomIdInt}, user: ${currentUserId}`);

        // Query with sender username - join with users table
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
        
        console.log(`Got ${rows.length} messages for room ${roomIdInt}`);

        // Format messages efficiently with sender name
        const formattedMessages = rows.map(msg => ({
            id: msg.message_id.toString(),
            text: msg.content,
            time: new Date(msg.sent_at).toLocaleTimeString(),
            fromMe: msg.sender_id === currentUserId,
            senderName: msg.sender_name
        }));

        // Return the messages in JSON format
        return new Response(JSON.stringify(formattedMessages), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
        
    } catch (error) {
        console.error('Messages API Error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        return new Response(JSON.stringify({ 
            error: 'Internal server error',
            details: error.message 
        }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
        });
    }
};
