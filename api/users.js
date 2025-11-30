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

        const { rowCount, rows } = await sql`
            SELECT user_id, username, TO_CHAR(last_login, 'DD/MM/YYYY HH24:MI') as last_login
            FROM users
            WHERE user_id != ${currentUserId}
            ORDER BY last_login DESC
        `;

        if (rowCount === 0) {
            return new Response("[]", {
                status: 200,
                headers: { 'content-type': 'application/json' },
            });
        } else {
            return new Response(JSON.stringify(rows), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            });
        }
    } catch (error) {
        console.error("Erreur users API:", error);
        return new Response(JSON.stringify({error: "Erreur serveur"}), {
            status: 500,
            headers: { 'content-type': 'application/json' },
        });
    }
};
