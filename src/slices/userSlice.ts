import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Types pour l'utilisateur connecté
interface UserState {
  username: string;
  token: string;
  isAuthenticated: boolean;
}

const initialState: UserState = {
  username: '',
  token: '',
  isAuthenticated: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Définir l'utilisateur connecté
    setUser: (state, action: PayloadAction<{ username: string; token: string }>) => {
      state.username = action.payload.username;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    
    // Déconnecter l'utilisateur
    logout: (state) => {
      state.username = '';
      state.token = '';
      state.isAuthenticated = false;
    },
    
    // Initialiser depuis le sessionStorage
    initializeFromStorage: (state) => {
      const token = sessionStorage.getItem('token');
      const username = sessionStorage.getItem('username');
      
      if (token && username) {
        state.token = token;
        state.username = username;
        state.isAuthenticated = true;
      }
    },
  },
});

export const { setUser, logout, initializeFromStorage } = userSlice.actions;
export default userSlice.reducer;
