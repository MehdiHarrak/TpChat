import {getConnecterUser, triggerNotConnected} from "../lib/session";
// import { Redis } from '@upstash/redis';
// const PushNotifications = require("@pusher/push-notifications-server");

export default async (request, response) => {
    try {
        const headers = new Headers(request.headers);
        const user = await getConnecterUser(request);
        if (user === undefined || user === null) {
            console.log("Not connected");
            triggerNotConnected(response);
        }

        const message = await request.body;

        // TODO : save message

        response.send("OK");
    } catch (error) {
        console.log(error);
        response.status(500).json(error);
    }
};
