import { v4 as uuidv4 } from 'uuid';

const useDeviceId = () => {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = uuidv4(); // Eine neue UUID erzeugen
    localStorage.setItem('device_id', deviceId); // Im localStorage speichern
  }
  return deviceId;
};

export default useDeviceId;
