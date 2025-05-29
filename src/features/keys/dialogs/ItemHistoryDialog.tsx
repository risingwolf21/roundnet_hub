import { Alert, CircularProgress, List, ListItem, ListItemText } from '@mui/material';
import { format } from 'date-fns';
import React from 'react';
import { SwipeableDialog } from '../../../components/SwipeableDialog';
import { useItemHistory } from '../query';
import { DialogProps } from '@toolpad/core';

export const ItemHistoryDialog = ({ payload, open, onClose }: DialogProps<Item>) => {

  const { data: history = [], error, isLoading } = useItemHistory(payload.id);

  return (
    <SwipeableDialog open={open} onClose={() => onClose()} title={'Schlüssel Historie - ' + payload.name}>
      {error && (
        <Alert sx={{ m: 2 }} severity="error">
          {'Could not load key history: ' + error}
        </Alert>
      )}
      {!isLoading && history.length === 0 && !error && (
        <Alert sx={{ m: 2 }} severity={'info'}>
          Es ist keine Historie vorhanden!
        </Alert>
      )}
      {isLoading && <CircularProgress />}
      <List sx={{ maxHeight: '70%', overflow: 'auto', pb: "env(safe-area-inset-bottom)" }}>
        {history.map((x) => (
          <ListItem key={x.id} divider>
            <ListItemText
              primary={`${x.pastUser?.displayName} ➔ ${x.currentUser?.displayName}`}
              secondary={format(x.created_at, 'dd.MM.yyyy HH:mm')}
            />
          </ListItem>
        ))}
      </List>
    </SwipeableDialog>
  );
};
