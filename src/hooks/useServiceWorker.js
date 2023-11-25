import { useState, createContext, useEffect, useMemo, useContext } from "react";
import * as serviceWorker from "../serviceWorkerRegistration";

const ServiceWorkerContext = createContext();

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
                setUpdateAvailable(false);
                window.location.reload();
            }
        });
    }, [waitingServiceWorker]);

    const value = useMemo(() => ({
        isUpdateAvailable,
        updateAssets: () => {
            if (waitingServiceWorker) {
                // We send the SKIP_WAITING message to tell the Service Worker
                // to update its cache and flush the old one
                waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
                setUpdateAvailable(false);
                window.location.reload();
            }
        }
    }), [isUpdateAvailable, waitingServiceWorker]);

    return { isUpdateAvailable: isUpdateAvailable, updateAssets: value.updateAssets }
}