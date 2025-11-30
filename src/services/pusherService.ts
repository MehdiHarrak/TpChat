// src/services/pusherService.ts

declare global {
    interface Window {
      PusherPushNotifications: {
        Client: new (config: { instanceId: string }) => any;
        TokenProvider: new (config: { url: string; headers: Record<string, string> }) => any;
      };
    }
  }
  
  class PusherService {
    private client: any = null;
    private ready = false;
  
    isInitialized() {
      return this.ready && this.client !== null;
    }
  
    async initialize(): Promise<void> {
      if (this.isInitialized()) {
        console.log("Pusher already initialized");
        return;
      }
  
      const instanceId = process.env.REACT_APP_PUSHER_INSTANCE_ID;
      const token = sessionStorage.getItem("token");
      const userId = sessionStorage.getItem("externalId");
  
      if (!instanceId || !token || !userId) {
        console.warn("Missing instanceId/token/externalId — cannot initialize Pusher");
        return;
      }
  
      try {
        if (!("Notification" in window)) return;
        const permission = await window.Notification.requestPermission();
        if (permission !== "granted") return;
  
        if ("serviceWorker" in navigator) {
          await navigator.serviceWorker.register("/service-worker.js");
          console.log("Service worker registered ");
        }
  
        this.client = new window.PusherPushNotifications.Client({ instanceId });
        await this.client.start();
        console.log("Beams START ");
  
        await this.client.addDeviceInterest("global");
        console.log("Added to interest: global ");
  
        const tokenProvider = new window.PusherPushNotifications.TokenProvider({
            url: `/api/beams?user_id=${encodeURIComponent(userId)}`,
            headers: {
            Authorization: `Bearer ${token}`, // IMPORTANT
          },
        });
  
        await this.client.setUserId(userId, tokenProvider);
        console.log("User bound to Pusher Beams ");
  
        this.ready = true;
      } catch (error) {
        console.error("Error initializing Pusher:", error);
      }
    }
  
    disconnect(): void {
      if (this.client) {
        // Pusher Push Notifications client doesn't have a disconnect method
        // Just reset the state
        try {
          // Try to disconnect if the method exists (for compatibility)
          if (typeof this.client.disconnect === 'function') {
            this.client.disconnect();
          }
        } catch (error) {
          console.warn("Error during Pusher disconnect:", error);
        }
        this.client = null;
        this.ready = false;
        console.log("Pusher disconnected");
      }
    }
  }
  
  export const pusherService = new PusherService();
  (window as any).pusherService = pusherService; // optional debug
  