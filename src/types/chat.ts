export interface Message {
    id: string;
    fromMe: boolean;
    text: string;
    time: string;
    senderName?: string; // Optional sender name for room messages
}

export interface Conversation {
    id: string;
    name: string;
    avatar: string;
    online: boolean;
    lastMessage: string;
    lastTime: string;
    messages: Message[];
}
