import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Conversation } from '../types/chat';
import { fetchUsers } from '../user-api/userApi';

// Types pour les utilisateurs
interface UsersState {
  users: Conversation[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
}

const initialState: UsersState = {
  users: [],
  loading: false,
  error: null,
  lastFetch: null,
};

// Async thunk pour récupérer les utilisateurs
export const fetchUsersAsync = createAsyncThunk(
  'users/fetchUsers',
  async () => {
    const usersData = await fetchUsers();
    
    const transformedUsers: Conversation[] = usersData.map((user: any) => ({
      id: user.user_id.toString(),
      name: user.username,
      avatar: user.username.charAt(0).toUpperCase(),
      online: true, // Assume online for now
      lastMessage: 'No messages yet',
      lastTime: user.last_login || 'Never',
      messages: []
    }));
    
    return transformedUsers;
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    updateUserOnlineStatus: (state, action: PayloadAction<{ userId: string; online: boolean }>) => {
      const { userId, online } = action.payload;
      const user = state.users.find(u => u.id === userId);
      if (user) {
        user.online = online;
      }
    },
    
    updateUserLastMessage: (state, action: PayloadAction<{ userId: string; lastMessage: string; lastTime: string }>) => {
      const { userId, lastMessage, lastTime } = action.payload;
      const user = state.users.find(u => u.id === userId);
      if (user) {
        user.lastMessage = lastMessage;
        user.lastTime = lastTime;
      }
    },
    
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsersAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsersAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
        state.lastFetch = Date.now();
      })
      .addCase(fetchUsersAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch users';
      });
  },
});

export const {
  updateUserOnlineStatus,
  updateUserLastMessage,
  clearError,
} = usersSlice.actions;

export default usersSlice.reducer;
