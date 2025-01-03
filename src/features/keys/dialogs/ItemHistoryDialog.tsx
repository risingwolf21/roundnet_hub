import React, { useEffect, useState } from 'react';
import { FullKeyHistory } from '../../../types/supabaseTypes';
import { SwipeableDialog } from '../../../components/SwipeableDialog';
import { captureException } from '@sentry/react';
import { Alert, CircularProgress, List, ListItem, ListItemText } from '@mui/material';
import { format } from 'date-fns';
import { SupabaseKeysRepository } from '../../../repository/KeysRepository';

type ItemHistoryDialogProps = {
  open: boolean;
  handleClose: () => void;
  setOpen: (value: boolean) => void;
  item: ItemUpdate | null;
};

export const ItemHistoryDialog = ({ open, setOpen, handleClose, item }: ItemHistoryDialogProps) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<FullKeyHistory[]>([]);

  useEffect(() => {
    if (!item || !item.id) {
      setError('Es wurde kein Schlüssel ausgewählt');
      return;
    }

    setHistory([]);
    setLoading(true);
    SupabaseKeysRepository.loadKeyHistory(item.id)
      .then((result) => {
        setError(null);
        setHistory(result.data ?? []);
      })
      .catch((error) => {
        captureException(error);
        setError(error.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [item]);

  return (
    <SwipeableDialog open={open} setOpen={setOpen} onClose={handleClose} title={'Schlüssel Historie - ' + item?.name}>
      {error && (
        <Alert sx={{ m: 2 }} severity="error">
          {'Could not load key history: ' + error}
        </Alert>
      )}
      {!loading && history.length === 0 && !error && (
        <Alert sx={{ m: 2 }} severity={'info'}>
          Es ist keine Historie vorhanden!
        </Alert>
      )}
      {loading && <CircularProgress />}
      <List sx={{ maxHeight: '70%', overflow: 'auto', pb: "env(safe-area-inset-bottom)" }}>
        {history.map((x) => (
          <ListItem key={x.id} divider>
            <ListItemText
              primary={`${x.pastUser.displayName} ➔ ${x.currentUser.displayName}`}
              secondary={format(x.created_at, 'dd.MM.yyyy HH:mm')}
            />
          </ListItem>
        ))}
      </List>
    </SwipeableDialog>
  );
};
