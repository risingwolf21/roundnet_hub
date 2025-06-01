import React, { PropsWithChildren, useState } from "react";
import { register } from "src/serviceWorkerRegistration";

const ServiceWorkerContext = React.createContext<{
  isUpdateAvailable: boolean;
  updateAssets: () => void;
}>(null!);

export const ServiceWorkerProvider = ({ children }: PropsWithChildren) => {
  const [waitingServiceWorker, setWaitingServiceWorker] = useState<ServiceWorker | null>(null);
  const [isUpdateAvailable, setUpdateAvailable] = useState(false);

  React.useEffect(() => {
    register({
      onUpdate: registration => {
        setWaitingServiceWorker(registration.waiting);
        setUpdateAvailable(true);
      }
    });
  }, []);

  React.useEffect(() => {
    if (waitingServiceWorker)
      waitingServiceWorker.addEventListener('statechange', (event) => {
        const sw = event?.target as ServiceWorker;
        if (sw?.state === 'activated') {
          window.location.reload();
        }
      });
  }, [waitingServiceWorker]);

  const value = React.useMemo(() => ({
    isUpdateAvailable,
    updateAssets: () => {
      if (waitingServiceWorker) {
        waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
      }
    }
  }), [isUpdateAvailable, waitingServiceWorker]);

  return (
    <ServiceWorkerContext.Provider value={value}>
      {children}
    </ServiceWorkerContext.Provider>
  );
}

export const useServiceWorker = () => {
  return React.useContext(ServiceWorkerContext);
}