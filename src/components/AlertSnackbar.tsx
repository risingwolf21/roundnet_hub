import {Alert, AlertColor, Button, Snackbar, SnackbarCloseReason} from '@mui/material';
import React, {SyntheticEvent} from 'react';

export type AlertMessage = {
  message: string;
  severity: AlertColor;
};

type AlertSnackbarProps = {
  close?: (() => void) | null;
  alertInfo: AlertMessage | null;
  autoHideDuration?: number | null;
};

export const AlertSnackbar = ({ alertInfo, close, autoHideDuration }: AlertSnackbarProps) => {
  const handleSnackbarClose = (event: Event | SyntheticEvent<any, Event>, reason: SnackbarCloseReason) => {
    if (reason === 'clickaway') {
      return;
    }
    close && close();
  };

  const versionError = () => alertInfo?.message === 'Version mismatch';

  const handleAlertClose = (_: SyntheticEvent<Element, Event>) => {
    close && close();
  };

  return (
    <Snackbar
        sx={{position: 'fixed', right: '16px', bottom: 'calc(72px + env(safe-area-inset-bottom))'}}
      open={alertInfo != null}
      autoHideDuration={versionError() ? null : autoHideDuration}
      onClose={close ? handleSnackbarClose : undefined}
    >
      <Alert
        onClose={close ? handleAlertClose : undefined}
        severity={alertInfo?.severity}
        sx={{ width: '100%' }}
        action={
          versionError() ? (
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                window.location.reload();
              }}
            >
              UPDATE
            </Button>
          ) : undefined
        }
      >
        {alertInfo?.message}
      </Alert>
    </Snackbar>
  );
};
