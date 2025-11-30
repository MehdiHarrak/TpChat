import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Message } from '../types/chat';
import { fetchMessages, fetchPrivateMessages, sendMessage } from '../user-api/userApi';

// Types pour les messages
interface MessagesState {
  messages: { [key: string]: Message[] }; // key = roomId ou userId
  loading: boolean;
  error: string | null;
  sending: boolean;
  lastFetch: { [key: string]: number }; // Timestamp de la dernière récupération par clé
}

const initialState: MessagesState = {
  messages: {},
  loading: false,
  error: null,
  sending: false,
  lastFetch: {},
};

// Async thunks pour les messages
export const fetchMessagesAsync = createAsyncThunk(
  'messages/fetchMessages',
  async ({ key, type }: { key: string; type: 'user' | 'room' }, { getState }) => {
    const state = getState() as { messages: MessagesState };
    const lastFetchTime = state.messages.lastFetch[key];
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes en millisecondes
    
    // Si les messages sont en cache et récents, ne pas faire d'appel API
    if (lastFetchTime && (now - lastFetchTime) < CACHE_DURATION && state.messages.messages[key]) {
      console.log(`Messages pour ${key} récupérés depuis le cache`);
      return { key, messages: state.messages.messages[key], fromCache: true };
    }
    
    // Sinon, faire l'appel API
    console.log(`Récupération des messages pour ${key} depuis l'API`);
    let messages: Message[];
    
    if (type === 'user') {
      messages = await fetchPrivateMessages(key);
    } else {
      messages = await fetchMessages(key);
    }
    
    return { key, messages, fromCache: false };
  }
);

export const sendMessageAsync = createAsyncThunk(
  'messages/sendMessage',
  async (messageData: {
    recipient_id?: number;
    content: string;
    room_id?: number;
  }) => {
    return await sendMessage(messageData);
  }
);

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    // Ajouter un message optimiste
    addOptimisticMessage: (state, action: PayloadAction<{ key: string; message: Message }>) => {
      const { key, message } = action.payload;
      if (!state.messages[key]) {
        state.messages[key] = [];
      }
      state.messages[key].push(message);
    },
    
    // Remplacer un message optimiste par le vrai message
    replaceOptimisticMessage: (state, action: PayloadAction<{ key: string; tempId: string; realMessage: Message }>) => {
      const { key, tempId, realMessage } = action.payload;
      if (state.messages[key]) {
        const index = state.messages[key].findIndex(msg => msg.id === tempId);
        if (index !== -1) {
          state.messages[key][index] = realMessage;
        }
      }
    },
    
    // Supprimer un message optimiste en cas d'erreur
    removeOptimisticMessage: (state, action: PayloadAction<{ key: string; tempId: string }>) => {
      const { key, tempId } = action.payload;
      if (state.messages[key]) {
        state.messages[key] = state.messages[key].filter(msg => msg.id !== tempId);
      }
    },
    
    // Effacer les messages d'une conversation (pour logout ou reset complet)
    clearMessages: (state, action: PayloadAction<string>) => {
      const key = action.payload;
      state.messages[key] = [];
      delete state.lastFetch[key]; // Supprimer aussi le timestamp
    },
    
    // Effacer seulement l'affichage des messages (pour changement de conversation)
    clearCurrentMessages: (state, action: PayloadAction<string>) => {
      const key = action.payload;
      // Ne pas effacer les messages du store, juste changer la sélection
      // Les messages restent en cache pour un retour rapide
    },
    
    // Forcer le refresh des messages (ignorer le cache)
    forceRefreshMessages: (state, action: PayloadAction<string>) => {
      const key = action.payload;
      delete state.lastFetch[key]; // Supprimer le timestamp pour forcer le refresh
    },
    
    // Effacer tous les messages (pour logout)
    clearAllMessages: (state) => {
      state.messages = {};
      state.lastFetch = {};
    },
    
    // Effacer toutes les erreurs
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch messages
      .addCase(fetchMessagesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMessagesAsync.fulfilled, (state, action) => {
        state.loading = false;
        const { key, messages, fromCache } = action.payload;
        
        // Mettre à jour les messages
        state.messages[key] = messages;
        
        // Mettre à jour le timestamp seulement si ce n'est pas depuis le cache
        if (!fromCache) {
          state.lastFetch[key] = Date.now();
        }
      })
      .addCase(fetchMessagesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch messages';
      })
      
      // Send message
      .addCase(sendMessageAsync.pending, (state) => {
        state.sending = true;
        state.error = null;
      })
      .addCase(sendMessageAsync.fulfilled, (state) => {
        state.sending = false;
      })
      .addCase(sendMessageAsync.rejected, (state, action) => {
        state.sending = false;
        state.error = action.error.message || 'Failed to send message';
      });
  },
});

export const {
  addOptimisticMessage,
  replaceOptimisticMessage,
  removeOptimisticMessage,
  clearMessages,
  clearCurrentMessages,
  forceRefreshMessages,
  clearAllMessages,
  clearError,
} = messagesSlice.actions;

export default messagesSlice.reducer;
