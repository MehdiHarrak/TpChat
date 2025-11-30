import {Session, SessionCallback, ErrorCallback, User} from "../model/common";
import {CustomError} from "../model/CustomError";

export function registerUser(user: {
    username: string;
    email: string;
    password: string;
}, onResult: SessionCallback, onError: ErrorCallback) {
    fetch("/api/signup",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(user),
        })
        .then(async (response) => {
            if (response.ok) {
                const session = await response.json() as Session;
                sessionStorage.setItem('token', session.token);
                sessionStorage.setItem('externalId', session.externalId);
                sessionStorage.setItem('username', session.username || "");
                sessionStorage.setItem('email', session.email || "");
                onResult(session)
            } else {
                const error = await response.json() as CustomError;
                onError(error);
            }
        }, onError);
}
