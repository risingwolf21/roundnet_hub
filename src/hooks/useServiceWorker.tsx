import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { onServiceWorkerInitialized, onUpdateServiceWorker } from 'src/redux/applicationSlice';
import { RootState, useAppDispatch } from 'src/redux/store';
import * as serviceWorker from '../serviceWorkerRegistration';

export type ServiceWorkerConfig = {
  onUpdate: (registration: ServiceWorkerRegistration) => void;
  onSuccess: (registration: ServiceWorkerRegistration) => void;
};

export const useServiceWorker = () => {
  const { serviceWorkerUpdated, serviceWorkerRegistration } = useSelector((state: RootState) => state.application);
  const dispatch = useAppDispatch();

  useEffect(() => {
    serviceWorker.register({
      onUpdate: (registration: ServiceWorkerRegistration) => dispatch(onUpdateServiceWorker(registration)),
      onSuccess: () => dispatch(onServiceWorkerInitialized())
    });
  }, [dispatch]);

  const value = useMemo(
    () => ({
      serviceWorkerUpdated,
      updateServiceWorker: () => {
        if (serviceWorkerRegistration?.waiting) {
          serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
          serviceWorkerRegistration.waiting.addEventListener('statechange', (e: Event) => {
            const sw = e?.target as ServiceWorker;
            if (sw.state === 'activated') {
              window.location.reload();
            }
          });
        }
      },
    }),
    [serviceWorkerUpdated, serviceWorkerRegistration]
  );

  return { isUpdateAvailable: value.serviceWorkerUpdated, updateServiceWorker: value.updateServiceWorker };
};
