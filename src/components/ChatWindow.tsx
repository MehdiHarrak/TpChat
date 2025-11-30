import React, { useState, useRef, useEffect } from 'react';
import {
    TextField,
    IconButton,
    Box,
    Typography,
    Paper,
    Avatar,
    InputAdornment,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Message } from '../types/chat';

interface ChatWindowProps {
    selectedId: string;
    selectedName?: string;
    type: 'user' | 'room';
    messages: Message[];
    onSendMessage: (content: string) => void;
    isLoading?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
                                                   selectedId,
                                                   selectedName,
                                                   type,
                                                   messages,
                                                   onSendMessage,
                                                   isLoading = false,
                                               }) => {
    const [content, setContent] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = () => {
        if (content.trim()) {
            onSendMessage(content);
            setContent('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <Box
            sx={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#ffffff',
            }}
        >
            {/* Header */}
            <Paper
                elevation={1}
                sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 0,
                    borderBottom: '1px solid #e0e0e0',
                }}
            >
                <Avatar sx={{ bgcolor: type === 'user' ? '#1976d2' : '#9c27b0', mr: 2 }}>
                    {String(selectedId).charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                        {selectedName || selectedId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {type === 'user' ? 'Active now' : `${messages.length} messages`}
                    </Typography>
                </Box>
                <IconButton>
                    <MoreVertIcon />
                </IconButton>
            </Paper>

            {/* Messages Container */}
            <Box
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    p: 2,
                    bgcolor: '#f8f9fa',
                    backgroundImage: 'linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)',
                }}
            >
                {isLoading ? (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: 'text.secondary',
                        }}
                    >
                        <Typography variant="body1">Loading messages...</Typography>
                    </Box>
                ) : messages.length === 0 ? (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                            pt: 3,
                        }}
                    >
                        <Typography variant="body1" color="text.secondary">
                            No messages yet. Start the conversation!
                        </Typography>
                    </Box>
                ) : (
                    messages.map((msg, index) => (
                        <Box
                            key={msg.id}
                            sx={{
                                display: 'flex',
                                justifyContent: msg.fromMe ? 'flex-end' : 'flex-start',
                                mb: 2,
                                mt: index === 0 ? 1 : 0, // Add top margin to first message
                                px: 1, // Add horizontal padding
                            }}
                        >
                            {!msg.fromMe && (
                                <Avatar
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        mr: 1,
                                        bgcolor: '#1976d2',
                                    }}
                                >
                                    {type === 'room' && msg.senderName 
                                        ? msg.senderName.charAt(0).toUpperCase()
                                        : String(selectedId).charAt(0).toUpperCase()}
                                </Avatar>
                            )}
                            <Box
                                sx={{
                                    maxWidth: '60%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: msg.fromMe ? 'flex-end' : 'flex-start',
                                }}
                            >
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 1.5,
                                        bgcolor: msg.fromMe ? '#1976d2' : 'white',
                                        color: msg.fromMe ? 'white' : 'text.primary',
                                        borderRadius: 2,
                                        borderTopRightRadius: msg.fromMe ? 0 : 2,
                                        borderTopLeftRadius: msg.fromMe ? 2 : 0,
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                    }}
                                >
                                    {type === 'room' && !msg.fromMe && msg.senderName && (
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                display: 'block', 
                                                fontWeight: 600, 
                                                mb: 0.5,
                                                color: msg.fromMe ? 'white' : '#1976d2'
                                            }}
                                        >
                                            {msg.senderName}
                                        </Typography>
                                    )}
                                    <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                                        {msg.text}
                                    </Typography>
                                </Paper>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ mt: 0.5, px: 1 }}
                                >
                                    {msg.time}
                                </Typography>
                            </Box>
                        </Box>
                    ))
                )}
                <div ref={messagesEndRef} />
            </Box>

            {/* Input Area */}
            <Box
                sx={{
                    p: 2,
                    bgcolor: 'white',
                    borderTop: '1px solid #e0e0e0',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                    <IconButton size="small" sx={{ mb: 0.5 }}>
                        <AttachFileIcon />
                    </IconButton>
                    <TextField
                        fullWidth
                        multiline
                        maxRows={4}
                        placeholder="Type a message..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyPress={handleKeyPress}
                        variant="outlined"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 3,
                                bgcolor: '#f5f5f5',
                                '& fieldset': {
                                    borderColor: 'transparent',
                                },
                                '&:hover fieldset': {
                                    borderColor: '#e0e0e0',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#1976d2',
                                },
                            },
                        }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton size="small">
                                        <EmojiEmotionsIcon />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                    <IconButton
                        onClick={handleSendMessage}
                        disabled={!content.trim()}
                        sx={{
                            bgcolor: content.trim() ? '#1976d2' : '#e0e0e0',
                            color: 'white',
                            mb: 0.5,
                            '&:hover': {
                                bgcolor: content.trim() ? '#1565c0' : '#e0e0e0',
                            },
                            '&:disabled': {
                                bgcolor: '#e0e0e0',
                                color: 'white',
                            },
                        }}
                    >
                        <SendIcon />
                    </IconButton>
                </Box>
            </Box>
        </Box>
    );
};

export default ChatWindow;
