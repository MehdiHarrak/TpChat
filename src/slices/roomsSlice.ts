import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchRooms } from '../user-api/userApi';

// Types pour les rooms
interface Room {
  room_id: string;
  name: string;
}

interface RoomsState {
  rooms: Room[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
}

const initialState: RoomsState = {
  rooms: [],
  loading: false,
  error: null,
  lastFetch: null,
};

// Async thunk pour récupérer les rooms
export const fetchRoomsAsync = createAsyncThunk(
  'rooms/fetchRooms',
  async () => {
    return await fetchRooms();
  }
);

const roomsSlice = createSlice({
  name: 'rooms',
  initialState,
  reducers: {
    // Ajouter une nouvelle room
    addRoom: (state, action: PayloadAction<Room>) => {
      state.rooms.push(action.payload);
    },
    
    // Supprimer une room
    removeRoom: (state, action: PayloadAction<string>) => {
      const roomId = action.payload;
      state.rooms = state.rooms.filter(room => room.room_id !== roomId);
    },
    
    // Effacer les erreurs
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoomsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRoomsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms = action.payload;
        state.lastFetch = Date.now();
      })
      .addCase(fetchRoomsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch rooms';
      });
  },
});

export const {
  addRoom,
  removeRoom,
  clearError,
} = roomsSlice.actions;

export default roomsSlice.reducer;
