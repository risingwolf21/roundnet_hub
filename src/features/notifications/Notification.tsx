import { Alert, AlertTitle } from '@mui/material';
import { toast } from 'react-toastify';
import './toastify.css';

export const Notification = ({ title, body, toastId }: { title: string; body: string; toastId: string }) => {
  return (
    <Alert severity={'info'} title={title} onClose={() => toast.dismiss(toastId)}>
      <AlertTitle>{title}</AlertTitle>
      {body}
    </Alert>
  );
};
