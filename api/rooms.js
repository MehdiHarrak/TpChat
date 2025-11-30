import { sql } from "@vercel/postgres";
import { checkSession, unauthorizedResponse } from "../lib/session";

export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    try {
        const connected = await checkSession(request);
        if (!connected) {
            return unauthorizedResponse();
        }

        const { rowCount, rows } = await sql`
            SELECT room_id, name
            FROM rooms
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
        console.error("Erreur rooms API:", error);
        return new Response(JSON.stringify({error: "Erreur serveur"}), {
            status: 500,
            headers: { 'content-type': 'application/json' },
        });
    }
};
