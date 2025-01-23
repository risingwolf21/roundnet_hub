import { useFirebase } from '../../hooks/useFirebase';
import { ToastContainer } from 'react-toastify';
import React from 'react';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../auth/AuthContext';

export const FirebaseMessaging = () => {
  const { user, deviceId } = useAuth();
  useFirebase(user, deviceId);

  return (
    <ToastContainer
      containerId={'main'}
      position="top-center"
      newestOnTop
      closeOnClick={false}
      autoClose={4000}
      draggable
      style={{
        padding: 0,
      }}
    />
  );
};
