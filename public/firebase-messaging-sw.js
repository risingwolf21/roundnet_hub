// Scripts for firebase and firebase messaging
// eslint-disable-next-line no-undef
importScripts("https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js");
// eslint-disable-next-line no-undef
importScripts(
    "https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js"
);

// Initialize the Firebase app in the service worker
// "Default" Firebase configuration (prevents errors)

const defaultConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

firebase.initializeApp(defaultConfig);

if (firebase.messaging.isSupported()) {
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
        const notificationTitle = payload.data.title;
        self.dispatchEvent("NOTIFICATION_RECIEVED");
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