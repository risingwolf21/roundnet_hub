import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const useDeviceId = () => {
  const [id, setId] = useState<string>('');
  useEffect(() => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = uuidv4(); // Eine neue UUID erzeugen
      localStorage.setItem('device_id', deviceId); // Im localStorage speichern
    }
    setId(deviceId);
  }, []);

  return id;
};

export default useDeviceId;
