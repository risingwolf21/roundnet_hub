import {getToken, Messaging, onMessage} from "firebase/messaging";
import {messaging} from "../firebase/firebaseConfig";
import React, {useEffect} from "react";
import {SupabaseUserRepository} from "../repository/UserRepository";
import {User} from "../types/supabaseTypes";
import {captureException} from "@sentry/react";
import {toast} from "react-toastify";
import {Notification as NotificationComponent} from "../components/Notification";

export function useFirebase(user: User | null) {
    async function requestPermission(user: User, messaging: Messaging) {
        //requesting permission using Notification API
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
            getToken(messaging, {
                vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY,
            }).then(token => {
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
            }).catch(error => {
                captureException(error, scope => {
                    scope.setExtra("displayName", user.displayName);
                    scope.setExtra("email", user.email);
                    scope.setExtra("userId", user.userId);
                    return scope;
                })
            })

        } else if (permission === "denied") {
            //notifications are blocked
            console.log("You denied for the notification or the user was null", user);
        }
    }

    useEffect(() => {
        messaging.then(messagingResolver => {
            if (messagingResolver && user) {
                onMessage(messagingResolver, (payload) => {
                    toast(<NotificationComponent title={payload.data?.title ?? "Title"} body={payload.data?.body ?? ""}
                                                 toastId={"123"}/>, {
                        autoClose: false, toastId: "123", containerId: "main"
                    })
                });
                requestPermission(user, messagingResolver)
            }
        });
    }, [user]);
}

