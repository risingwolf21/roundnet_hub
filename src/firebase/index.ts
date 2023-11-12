import { initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";

const firebaseConfig = {
    apiKey: process.env.REACT_APP_firebaseApiKey,
    authDomain: process.env.REACT_APP_firebaseAuthDomain,
    databaseURL: process.env.REACT_APP_firebaseDatabaseURL,
    projectId: process.env.REACT_APP_firebaseProjectId,
    storageBucket: process.env.REACT_APP_firebaseStorageBucket,
    messagingSenderId: process.env.REACT_APP_firebaseMessagingSenderId,
    appId: process.env.REACT_APP_firebaseAppId
};

const UrlFirebaseConfig = new URLSearchParams({
    apiKey: process.env.REACT_APP_firebaseApiKey,
    authDomain: process.env.REACT_APP_firebaseAuthDomain,
    databaseURL: process.env.REACT_APP_firebaseDatabaseURL,
    projectId: process.env.REACT_APP_firebaseProjectId,
    storageBucket: process.env.REACT_APP_firebaseStorageBucket,
    messagingSenderId: process.env.REACT_APP_firebaseMessagingSenderId,
    appId: process.env.REACT_APP_firebaseAppId
}.toString());

const swUrl = `${process.env.REACT_APP_POZ_URL}/firebase-messaging-sw.js?${UrlFirebaseConfig}`;

const app = initializeApp(firebaseConfig);
export const messaging = (async () => {
    try {
        const isSupportedBrowser = await isSupported();
        if (isSupportedBrowser) {
            return getMessaging(app);
        }
        console.log("Firebase is not supported in this browser");
        return null;
    } catch (err) {
        console.log(err);
        return null;
    }
})();

export default app;

export const onMessageListener = () =>
    new Promise(async (resolve) => {
        let messagingInstance = await messaging;
        if (messagingInstance)
            onMessage(messagingInstance, (payload) => {
                resolve(payload);
            });
    });

// getOrRegisterServiceWorker function is used to try and get the service worker if it exists, otherwise it will register a new one.
export const getOrRegisterServiceWorker = async () => {
    if (
        "serviceWorker" in navigator &&
        typeof window.navigator.serviceWorker !== "undefined"
    ) {
        const serviceWorker = await window.navigator.serviceWorker
            .getRegistration("/firebase-push-notification-scope");
        if (serviceWorker) return serviceWorker;
        return window.navigator.serviceWorker.register(
            "/firebase-messaging-sw.js",
            {
                scope: "/firebase-push-notification-scope",
            }
        );
    }
    throw new Error("The browser doesn`t support service worker.");
};

// getFirebaseToken function generates the FCM token 
export const getFirebaseToken = async () => {
    try {
        const messagingResolve = await messaging;
        if (messagingResolve) {
            return getOrRegisterServiceWorker().then((serviceWorkerRegistration) => {
                return Promise.resolve(
                    getToken(messagingResolve, {
                        vapidKey: process.env.REACT_APP_FB_VAPID_KEY,
                        serviceWorkerRegistration,
                    })
                );
            });
        }
    } catch (error) {
        console.log("An error occurred while retrieving token. ", error);
    }
};