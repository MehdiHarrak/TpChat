import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import { Box, Button, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { Message, Conversation } from '../types/chat';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { 
    fetchMessagesAsync,
    addOptimisticMessage,
    replaceOptimisticMessage,
    removeOptimisticMessage,
    clearMessages,
    clearCurrentMessages,
    forceRefreshMessages,
    clearAllMessages
} from '../slices/messagesSlice';
import { fetchUsersAsync } from '../slices/usersSlice';
import { fetchRoomsAsync } from '../slices/roomsSlice';
import { logout, initializeFromStorage } from '../slices/userSlice';
import { sendMessage } from '../user-api/userApi';
import { pusherService } from '../services/pusherService';

const MessagePage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    
    // État local pour la sélection
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedName, setSelectedName] = useState<string | null>(null);
    const [type, setType] = useState<'user' | 'room' | null>(null);
    
    // État Redux
    const { users, loading: usersLoading } = useAppSelector(state => state.users);
    const { rooms, loading: roomsLoading } = useAppSelector(state => state.rooms);
    const { messages, loading: messagesLoading } = useAppSelector(state => state.messages);
    
    // Messages de la conversation sélectionnée
    const currentMessages = selectedId ? messages[selectedId] || [] : [];
    
    // Loading state combiné
    const isLoadingData = usersLoading || roomsLoading;
    const isLoadingMessages = messagesLoading;


    // Check authentication and initialize Redux state
    useEffect(() => {
        const token = sessionStorage.getItem('token');
        const externalId = sessionStorage.getItem('externalId');
        
        if (!token) {
            navigate('/');
        } else {
            // Initialize Redux state from sessionStorage
            dispatch(initializeFromStorage());
            
            // Initialize Pusher notifications (non-blocking)
            pusherService.initialize().catch(error => {
                console.warn('Pusher initialization failed, continuing without notifications:', error);
            });
        }
    }, [navigate, dispatch]);

    // Charger les utilisateurs et rooms au montage du composant
    useEffect(() => {
        dispatch(fetchUsersAsync());
        dispatch(fetchRoomsAsync());
    }, [dispatch]);

    // Charger les messages quand une conversation est sélectionnée
    useEffect(() => {
        if (selectedId && type) {
            dispatch(fetchMessagesAsync({ key: selectedId, type }));
        }
    }, [selectedId, type, dispatch]);

    // Fonction pour forcer le refresh des messages (utile pour les tests)
    const handleForceRefresh = () => {
        if (selectedId) {
            dispatch(forceRefreshMessages(selectedId));
            dispatch(fetchMessagesAsync({ key: selectedId, type: type! }));
        }
    };

    // Handle selecting a user or room from Sidebar
    const handleSelect = (id: string, type: 'user' | 'room', name?: string) => {
        // Ne pas effacer les messages - ils restent dans le cache
        // Les messages seront récupérés depuis le cache ou l'API selon leur âge
        setSelectedId(id);
        setSelectedName(name || null);
        setType(type);
    };

    // Handle logout
    const handleLogout = () => {
        // Clear Redux state
        dispatch(logout());
        
        // Clear all cached messages
        dispatch(clearAllMessages());
        
        // Disconnect Pusher
        pusherService.disconnect();
        
        // Clear session storage
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('externalId');
        sessionStorage.removeItem('username');
        sessionStorage.removeItem('email');
        sessionStorage.removeItem('userId');
        
        // Redirect to login page
        navigate('/');
    };

    // Handle sending a message
    const handleSendMessage = async (messageContent: string) => {
        if (!messageContent || !selectedId || !type) return;

        // Create optimistic message immediately
        const optimisticMessage: Message = {
            id: `temp_${Date.now()}`, // Temporary ID
            fromMe: true,
            text: messageContent,
            time: new Date().toLocaleTimeString(),
        };

        // Add optimistic message to Redux store immediately
        dispatch(addOptimisticMessage({ key: selectedId, message: optimisticMessage }));

        try {
            // Prepare message data based on conversation type
            const messageData = {
                content: messageContent,
                ...(type === 'room' 
                    ? { room_id: parseInt(selectedId) }
                    : { recipient_id: parseInt(selectedId) }
                )
            };

            console.log('Sending message with data:', messageData);

            // Send message to API
            const result = await sendMessage(messageData);
            
            // Replace optimistic message with real message
            const realMessage: Message = {
                id: result.message_id.toString(),
                fromMe: true,
                text: messageContent,
                time: new Date(result.sent_at).toLocaleTimeString(),
            };
            
            dispatch(replaceOptimisticMessage({ 
                key: selectedId, 
                tempId: optimisticMessage.id, 
                realMessage 
            }));
            
        } catch (error) {
            console.error('Error sending message:', error);
            // Remove optimistic message on error
            dispatch(removeOptimisticMessage({ 
                key: selectedId, 
                tempId: optimisticMessage.id 
            }));
        }
    };

    return (
        <Box
            sx={{
                height: '100vh',
                display: 'flex',
                overflow: 'hidden',
            }}
        >
            {/* Sidebar */}
            <Box
                sx={{
                    width: 250,
                    flexShrink: 0,
                    height: '100vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    <Sidebar users={users} rooms={rooms} onSelect={handleSelect} isLoading={isLoadingData} />
                </Box>
                
                {/* Logout Button */}
                <Box
                    sx={{
                        p: 2,
                        borderTop: '1px solid #e0e0e0',
                        bgcolor: '#f5f5f5',
                    }}
                >
                    <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<LogoutIcon />}
                        onClick={handleLogout}
                        sx={{
                            color: '#d32f2f',
                            borderColor: '#d32f2f',
                            '&:hover': {
                                borderColor: '#d32f2f',
                                bgcolor: 'rgba(211, 47, 47, 0.04)',
                            },
                        }}
                    >
                        Déconnexion
                    </Button>
                </Box>
            </Box>
            
            {/* ChatWindow */}
            <Box
                sx={{
                    flex: 1,
                    height: '100vh',
                    overflow: 'hidden',
                }}
            >
                {selectedId && type ? (
                    <ChatWindow
                        selectedId={selectedId}
                        selectedName={selectedName || undefined}
                        type={type}
                        messages={currentMessages}
                        onSendMessage={handleSendMessage}
                        isLoading={isLoadingMessages}
                    />
                ) : (
                    <Box
                        sx={{
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: '#f5f5f5',
                        }}
                    >
                        <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                            <h3>Select a conversation to start chatting</h3>
                        </Box>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default MessagePage;
