import { useFirebase } from '../../hooks/useFirebase';
import { ToastContainer } from 'react-toastify';
import React from 'react';
import 'react-toastify/dist/ReactToastify.css';
import { useApplication } from '../auth/ApplicationContext';

export const FirebaseMessaging = () => {
  const { user, deviceId } = useApplication();
  useFirebase(user!, deviceId);

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
