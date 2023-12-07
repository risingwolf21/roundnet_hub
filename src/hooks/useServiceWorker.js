import { useState, createContext, useEffect, useMemo, useContext } from "react";
import * as serviceWorker from "../serviceWorkerRegistration";

export const useServiceWorker = () => {
    const [waitingServiceWorker, setWaitingServiceWorker] = useState(null);
    const [isUpdateAvailable, setUpdateAvailable] = useState(false);

    useEffect(() => {
        serviceWorker.register({
            onUpdate: registration => {
                setWaitingServiceWorker(registration.waiting);
                setUpdateAvailable(true);
            },
            onWaiting: waiting => {
                setWaitingServiceWorker(waiting);
                setUpdateAvailable(true);
            },
            onSuccess: () => {
                setUpdateAvailable(false);
            }
        });
    }, []);

    useEffect(() => {
        // We setup an event listener to automatically reload the page
        // after the Service Worker has been updated, this will trigger
        // on all the open tabs of our application, so that we don't leave
        // any tab in an incosistent state
        waitingServiceWorker && waitingServiceWorker.addEventListener('statechange', event => {
            if (event.target.state === 'activated') {
                window.location.reload();
            }
        });
    }, [waitingServiceWorker]);

    const value = useMemo(() => ({
        isUpdateAvailable,
        updateAssets: () => {
            if (waitingServiceWorker) {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                    registrations.forEach((registration) => {
                        registration.unregister();
                    });
                    caches.keys().then((keyList) => {
                        return Promise.all(
                            keyList.map((key) => {
                                return caches.delete(key);
                            })
                        );
                    });
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                });
            }
        }
    }), [isUpdateAvailable, waitingServiceWorker]);

    return { isUpdateAvailable: isUpdateAvailable, updateAssets: value.updateAssets }
}