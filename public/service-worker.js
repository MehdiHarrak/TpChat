// service-worker.js
// Ce service worker gère les notifications push pour Pusher Beams

self.addEventListener('push', function(event) {
    console.log('Push event received:', event);
    
    if (event.data) {
        const data = event.data.json();
        console.log('Push data:', data);
        
        const options = {
            body: data.web.notification.body,
            icon: data.web.notification.icon || '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'chat-notification',
            data: data.web.data || {},
            actions: [
                {
                    action: 'open',
                    title: 'Ouvrir la conversation'
                },
                {
                    action: 'close',
                    title: 'Fermer'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification(data.web.notification.title, options)
        );
    }
});

self.addEventListener('notificationclick', function(event) {
    console.log('Notification clicked:', event);
    
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        // Ouvrir l'application
        event.waitUntil(
            clients.openWindow('/chat')
        );
    }
});

self.addEventListener('notificationclose', function(event) {
    console.log('Notification closed:', event);
});