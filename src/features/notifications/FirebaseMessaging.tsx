import React from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNotifications } from '../../hooks/useNotifications';
import { useApplication } from '../auth/ApplicationContext';

export const FirebaseMessaging = () => {
  const { user } = useApplication();
  useNotifications(user!);

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
