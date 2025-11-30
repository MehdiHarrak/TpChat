import { sql } from "@vercel/postgres";
import PushNotifications from "@pusher/push-notifications-server";
import { Redis } from '@upstash/redis';

export const config = {
    runtime: 'nodejs',
};

// Initialize Redis - support both UPSTASH and KV (Vercel) environment variables
function getRedis() {
    const restUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    
    if (!restUrl || !restToken) {
        throw new Error("Redis configuration not found");
    }
    
    const cleanUrl = restUrl.replace(/\/$/, '');
    return new Redis({ url: cleanUrl, token: restToken });
}

const redis = getRedis();

// Node.js compatible authentication function
async function getConnecterUser(req) {
    let token = req.headers.authorization;
    if (!token) return null;
  
    token = token.replace("Bearer ", "");
    console.log("checking " + token);
  
    const user = await redis.get(token);
    if (user) console.log("Got user :", user.username);
    return user;
}

export default async function handler(req, res) {
    try {
        // Check if the user is authenticated
        const user = await getConnecterUser(req);
        if (!user) {
            console.log("Not connected");
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { recipient_id, content, room_id } = req.body;
        
        // Validate required fields
        if (!content) {
            return res.status(400).json({ error: 'Missing required fields (content)' });
        }

        // Get sender_id from the authenticated user
        const sender_id = user.id;
        console.log('Authenticated user:', user);
        console.log('Sender ID:', sender_id);
        console.log('Recipient ID:', recipient_id);
        console.log('Room ID:', room_id);
        console.log('Content:', content);

        // Insert message into database
        const { rows } = await sql`
            INSERT INTO messages (room_id, sender_id, recipient_id, content, sent_at)
            VALUES (${room_id || null}, ${sender_id}, ${recipient_id || null}, ${content}, now())
            RETURNING message_id, sent_at
        `;

        console.log(`Message sent by user ${sender_id} to room ${room_id || 'private'}`);

        // Envoyer une notification Push si c'est un message privé
        if (recipient_id && !room_id) {
            try {
                // Récupérer les informations du destinataire
                const { rows: recipientRows } = await sql`
                    SELECT external_id, username FROM users WHERE user_id = ${recipient_id}
                `;
                
                if (recipientRows.length > 0) {
                    const recipient = recipientRows[0];
                    
                    // Initialiser Pusher Beams
                    const beamsClient = new PushNotifications({
                        instanceId: '815ff9ef-26ca-40c1-9e6e-5b3a0de52bc6',
                        secretKey: process.env.PUSHER_SECRET_KEY,
                    });

                    // Envoyer la notification
                    const publishResponse = await beamsClient.publishToUsers([recipient.external_id], {
                        web: {
                            notification: {
                                title: user.username,
                                body: content,
                                icon: "https://www.univ-brest.fr/themes/custom/ubo_parent/favicon.ico",
                                deep_link: `/chat?user=${sender_id}`,
                            },
                            data: {
                                sender_id: sender_id.toString(),
                                recipient_id: recipient_id.toString(),
                                message_id: rows[0].message_id.toString(),
                                type: 'private_message'
                            }
                        },
                    });

                    console.log('Push notification sent:', publishResponse);
                }
            } catch (pushError) {
                console.error('Error sending push notification:', pushError);
                // Ne pas faire échouer l'envoi du message si la notification échoue
            }
        }

        return res.json({ 
            success: true, 
            message_id: rows[0].message_id,
            sent_at: rows[0].sent_at 
        });
    } catch (error) {
        console.error("Error in message API:", error);
        console.error("Error details:", error.message, error.stack);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}




