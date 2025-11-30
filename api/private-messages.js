import { sql } from "@vercel/postgres";
import { checkSession, unauthorizedResponse, getConnecterUser } from "../lib/session";

export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    try {
        console.log('Private Messages API called');
        
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

        // Extract recipient_id from query parameters
        const url = new URL(request.url);
        const recipientId = url.searchParams.get('recipientId');
        
        console.log('Recipient ID from query:', recipientId);
        
        if (!recipientId) {
            return new Response(JSON.stringify({ error: 'Recipient ID is required' }), {
                status: 400,
                headers: { 'content-type': 'application/json' },
            });
        }

        const recipientIdInt = parseInt(recipientId);
        if (isNaN(recipientIdInt)) {
            return new Response(JSON.stringify({ error: 'Invalid recipient ID' }), {
                status: 400,
                headers: { 'content-type': 'application/json' },
            });
        }

        console.log(`Fetching private messages between user ${currentUserId} and ${recipientIdInt}`);

        // Fetch private messages between current user and recipient
        // Messages can be sent by either user, so we need to check both directions
        const { rows } = await sql`
            SELECT 
                message_id,
                content,
                sent_at,
                sender_id,
                recipient_id
            FROM messages 
            WHERE room_id IS NULL 
            AND (
                (sender_id = ${currentUserId} AND recipient_id = ${recipientIdInt})
                OR 
                (sender_id = ${recipientIdInt} AND recipient_id = ${currentUserId})
            )
            ORDER BY sent_at ASC
        `;
        
        console.log(`Got ${rows.length} private messages`);

        // Format messages efficiently
        const formattedMessages = rows.map(msg => ({
            id: msg.message_id.toString(),
            text: msg.content,
            time: new Date(msg.sent_at).toLocaleTimeString(),
            fromMe: msg.sender_id === currentUserId
        }));

        // Return the messages in JSON format
        return new Response(JSON.stringify(formattedMessages), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
        
    } catch (error) {
        console.error('Private Messages API Error:', error);
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
