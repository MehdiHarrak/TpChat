import React, { useState, useEffect } from 'react';
import { List, ListItem, ListItemText, Divider, ListItemButton } from '@mui/material';
import { Conversation } from '../types/chat';
import { fetchRooms } from "../user-api/userApi";  // Import the fetchRooms function

interface SidebarProps {
    users: Conversation[];  // Define the users prop type
    rooms: { room_id: string; name: string }[];  // Define the rooms prop type as an array of objects
    onSelect: (id: string, type: 'user' | 'room', name?: string) => void;  // Define the onSelect function type
    isLoading?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ users, rooms, onSelect, isLoading = false }) => {
    const [fetchedRooms, setFetchedRooms] = useState<{ room_id: string; name: string }[]>([]);

    // Use useEffect to fetch rooms data when the component mounts
    useEffect(() => {
        const loadRooms = async () => {
            try {
                const roomsData = await fetchRooms();  // Fetch rooms data
                console.log(roomsData);  // Check the fetched rooms data
                setFetchedRooms(roomsData);  // Set the fetched rooms data in state
            } catch (error) {
                console.error('Error fetching rooms:', error);
            }
        };

        loadRooms();  // Trigger the fetch
    }, []);  // Empty dependency array ensures this runs once when the component mounts

    return (
        <div style={{ height: '100vh', borderRight: '1px solid #ddd', padding: 16, overflow: 'auto' }}>
            <h3>Users</h3>
            <List>
                {isLoading ? (
                    <ListItemText primary="Loading users..." />
                ) : (
                    users.map((user) => (
                        <ListItemButton key={user.id} onClick={() => onSelect(user.id, 'user', user.name)}>
                            <ListItemText primary={user.name} secondary={user.lastMessage} />
                        </ListItemButton>
                    ))
                )}
            </List>
            <Divider />
            <h3>Rooms</h3>
            <List>
                {isLoading ? (
                    <ListItemText primary="Loading rooms..." />
                ) : (
                    fetchedRooms.map((room) => (
                        <ListItemButton key={room.room_id} onClick={() => onSelect(room.room_id, 'room', room.name)}>
                            <ListItemText primary={room.name} />
                        </ListItemButton>
                    ))
                )}
            </List>
        </div>
    );
};

export default Sidebar;
