import {getToken, onMessage} from "firebase/messaging";
import {messaging} from "../firebase/firebaseConfig";
import {useEffect} from "react";
import {SupabaseUserRepository} from "../repository/UserRepository";
import {User} from "../types/supabaseTypes";
import {captureException} from "@sentry/react";

export function useFirebase(user: User | null) {
    async function requestPermission(user: User) {
        //requesting permission using Notification API
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
            const token = await getToken(messaging, {
                vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY,
            });
            console.log("notification permission granted", token);

            SupabaseUserRepository.updateFCMToken(token, user).then(result => {
                if (result.error) {
                    captureException(result.error, scope => {
                        scope.setExtra("displayName", user.displayName);
                        scope.setExtra("email", user.email);
                        scope.setExtra("userId", user.userId);
                        return scope;
                    })
                }
            })
        } else if (permission === "denied") {
            //notifications are blocked
            console.log("You denied for the notification or the user was null", user);
        }
    }

    onMessage(messaging, (payload) => {
        console.log(payload);
    });

    useEffect(() => {
        if (user !== null)
            requestPermission(user);
    }, [user]);
}

