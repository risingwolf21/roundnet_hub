import { Alert, AlertTitle } from '@mui/material';
import React from 'react';
import './toastify.css';
import { toast } from 'react-toastify';

export const Notification = ({ title, body, toastId }: { title: string; body: string; toastId: string }) => {
  return (
    <Alert severity={'info'} title={title} onClose={() => toast.dismiss(toastId)}>
      <AlertTitle>{title}</AlertTitle>
      {body}
    </Alert>
  );
};
