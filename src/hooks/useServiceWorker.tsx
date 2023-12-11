import { useState, useEffect, useMemo, ChangeEvent } from "react";
import * as serviceWorker from "../serviceWorkerRegistration";

export type ServiceWorkerConfig = {
    onUpdate: (registration: ServiceWorkerRegistration) => void,
    onSuccess: (registration: ServiceWorkerRegistration) => void
}

export const useServiceWorker = () => {
    const [waitingServiceWorker, setWaitingServiceWorker] = useState<ServiceWorker | null>(null);
    const [isUpdateAvailable, setUpdateAvailable] = useState(false);

    useEffect(() => {
        serviceWorker.register({
            onUpdate: (registration: ServiceWorkerRegistration) => {
                setWaitingServiceWorker(registration.waiting);
                setUpdateAvailable(true);
            },
            onSuccess: () => {
                setUpdateAvailable(true);
            }
        });
    }, []);

    const value = useMemo(() => ({
        isUpdateAvailable,
        updateServiceWorker: () => {
            if (waitingServiceWorker) {
                // navigator.serviceWorker.getRegistrations().then((registrations) => {
                //     registrations.forEach((registration) => {
                //         registration.unregister();
                //     });
                //     caches.keys().then((keyList) => {
                //         return Promise.all(
                //             keyList.map((key) => {
                //                 return caches.delete(key);
                //             })
                //         );
                //     });
                // });
                waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
                waitingServiceWorker.addEventListener('statechange', (e: Event) => {
                    const sw = e?.target as ServiceWorker;
                    if (sw.state === 'activated') {
                        setUpdateAvailable(false);
                        window.location.reload();
                    }
                });
            }
        }
    }), [isUpdateAvailable, waitingServiceWorker]);

    return { isUpdateAvailable: value.isUpdateAvailable, updateServiceWorker: value.updateServiceWorker }
}