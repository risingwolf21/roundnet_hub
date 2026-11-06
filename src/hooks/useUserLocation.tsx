import { useEffect, useState } from 'react';
import { toast } from 'sonner'; // oder welche Library du nutzt

export function useUserLocation() {
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);

  useEffect(() => {
    // 1. Fallback, falls der Browser gar kein GPS unterstützt
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser.');
      return;
    }

    // 2. Success-Handler
    const handleSuccess = (position: GeolocationPosition) => {
      setUserLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    };

    // 3. Error-Handler (ersetzt deinen riesigen Permissions-Block)
    const handleError = (error: GeolocationPositionError) => {
      toast.error(`Error getting user location: \n ${error.message}`);

      // Wenn der Nutzer oder das System die Freigabe blockiert
      if (error.code === error.PERMISSION_DENIED) {
        if (window.location.href.startsWith('app-settings:')) {
          window.location.href = 'app-settings:location';
        }
      }
    };

    // 4. Einmalige Abfrage: kein dauerhaftes Tracking, nur der aktuelle Standort fuer die Kartenvorauswahl
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000,
    });
  }, []);

  return userLocation;
}