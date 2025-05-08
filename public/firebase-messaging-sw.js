// Scripts for firebase and firebase messaging
// eslint-disable-next-line no-undef
importScripts("https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js");
// eslint-disable-next-line no-undef
importScripts(
    "https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js"
);
// eslint-disable-next-line no-undef
importScripts("swEnv.js");

// Initialize the Firebase app in the service worker
// "Default" Firebase configuration (prevents errors)

const defaultConfig = {
    apiKey: swEnv.REACT_APP_FIREBASE_API_KEY,
    authDomain: swEnv.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: swEnv.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: swEnv.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: swEnv.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: swEnv.REACT_APP_FIREBASE_APP_ID,
    measurementId: swEnv.REACT_APP_FIREBASE_MEASUREMENT_ID,
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