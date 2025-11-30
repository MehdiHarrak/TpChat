import { Message } from "../types/chat";
import { CustomError } from "../model/CustomError";

function getAuthToken(): string | null {
    return sessionStorage.getItem('token');


    // Or localStorage.getItem('token')
}

export async function fetchUsers(): Promise<any[]> {
    const token = getAuthToken();
    const response = await fetch('/api/users', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '', // Include the token if it exists
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch users');
    }

    return await response.json();
}

export async function fetchRooms(): Promise<{ room_id: string; name: string }[]> {
    const token = getAuthToken();
    console.log(token);
    const response = await fetch('/api/rooms', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '', // Include the token if it exists
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch rooms');
    }

    // Directly return the response JSON without mapping it, as the API already returns the correct format
    return await response.json();
}

export async function fetchMessages(key: string): Promise<Message[]> {
    const token = getAuthToken();
    const response = await fetch(`/api/messages?roomId=${key}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '', // Include the token if it exists
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch messages');
    }

    return await response.json();
}

export async function fetchPrivateMessages(recipientId: string): Promise<Message[]> {
    const token = getAuthToken();
    const response = await fetch(`/api/private-messages?recipientId=${recipientId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch private messages');
    }

    return await response.json();
}

export async function sendMessage(messageData: {
    recipient_id?: number;
    content: string;
    room_id?: number;
}): Promise<{ success: boolean; message_id: number; sent_at: string }> {
    const token = getAuthToken();
    const response = await fetch('/api/message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(messageData),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
    }

    return await response.json();
}
