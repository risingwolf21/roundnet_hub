// Scripts for firebase and firebase messaging
// eslint-disable-next-line no-undef
importScripts("https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js");
// eslint-disable-next-line no-undef
importScripts(
    "https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js"
);

// Initialize the Firebase app in the service worker
// "Default" Firebase configuration (prevents errors)
const defaultConfig = {
    apiKey: true,
    projectId: true,
    messagingSenderId: true,
    appId: true,
};

firebase.initializeApp(defaultConfig);

if (firebase.messaging.isSupported()) {
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
        const notificationTitle = payload.data.title;

        self.registration.showNotification(notificationTitle, {
            body: payload.data.body,
            icon: self.location.origin + "/android-chrome-192x192.png",
            badge: self.location.origin + "/badge.png",
            tag: payload.data.id,
            renotify: true,
            data: {
                url: self.location.origin
            }
        });
    });
}

// Retrieve firebase messaging
