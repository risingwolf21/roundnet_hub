import { getToken, Messaging, onMessage } from 'firebase/messaging';
import { messaging } from '../firebase/firebaseConfig';
import React, { useEffect } from 'react';
import { SupabaseUserRepository } from '../repository/UserRepository';
import { captureException } from '@sentry/react';
import { toast } from 'react-toastify';
import { Notification as NotificationComponent } from '../features/notifications/Notification';

class MissingServiceWorkerError extends Error {
  constructor(msg: string) {
    super(msg);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, MissingServiceWorkerError.prototype);
  }
}

async function requestNotificationPermission(user: User, deviceId: string, messaging: Messaging) {
  //requesting permission using Notification API
  const permission = await Notification.requestPermission();

  if (permission === 'granted') {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration()
        .then(async (reg) => {
          const retrieveAndUploadMessagingToken = async () => {
            const token = await getToken(messaging, {
              vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY,
              serviceWorkerRegistration: reg
            });
            SupabaseUserRepository.updateFCMToken(token, deviceId, user.userId);
          }
          try {
            var serviceWorker: ServiceWorker | null = null;
            if (reg?.installing) serviceWorker = reg.installing;
            else if (reg?.waiting) serviceWorker = reg.waiting;
            else if (reg?.active) serviceWorker = reg.active;

            if (serviceWorker) {
              if (serviceWorker.state === "activated") {
                await retrieveAndUploadMessagingToken();
              } else {
                serviceWorker.onstatechange = async (e) => {
                  if (serviceWorker?.state === "activated") {
                    await retrieveAndUploadMessagingToken();
                  }
                }
              }
            } else {
              throw new MissingServiceWorkerError("No active ServiceWorker registration was found.")
            }
          } catch (error) {
            captureException(error, (scope) => {
              scope.setExtra('displayName', user.displayName);
              scope.setExtra('email', user.email);
              scope.setExtra('userId', user.userId);
              return scope;
            });
          }
        })
    }
  } else if (permission === 'denied') {
    //notifications are blocked
  }
}

const isNotificationSupported = () =>
  'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

export function useFirebase(user: User, deviceId: string) {
  useEffect(() => {
    messaging.then((messagingResolver) => {
      if (messagingResolver) {
        onMessage(messagingResolver, (payload) => {
          toast(
            <NotificationComponent
              title={payload.data?.title ?? 'Title'}
              body={payload.data?.body ?? ''}
              toastId={'123'}
            />,
            {
              autoClose: false,
              toastId: '123',
              containerId: 'main',
            }
          );
        });
        if (isNotificationSupported()) requestNotificationPermission(user, deviceId, messagingResolver);
      }
    });
  }, [user, deviceId]);
}
