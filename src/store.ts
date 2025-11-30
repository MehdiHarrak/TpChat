// src/store.ts
import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/usersSlice';
import messagesReducer from './slices/messagesSlice';
import usersReducer from './slices/usersSlice';
import roomsReducer from './slices/roomsSlice';

export const store = configureStore({
    reducer: {
        user: userReducer,
        messages: messagesReducer,
        users: usersReducer,
        rooms: roomsReducer,
    },
});

// Typage de l'état global de Redux
export type RootState = ReturnType<typeof store.getState>;

// Typage de la fonction dispatch
export type AppDispatch = typeof store.dispatch;
