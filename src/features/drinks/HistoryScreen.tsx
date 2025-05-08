import { Box, LinearProgress, Typography } from '@mui/material';
import { captureException } from '@sentry/react';
import { useNotifications } from '@toolpad/core/useNotifications';
import moment from 'moment/moment';
import React, { useEffect, useState } from 'react';
import { InfiniteScrollList } from '../../components/InfiniteScrollList';
import Layout from '../../components/Layout';
import { useAppDispatch } from '../../redux/store';
import { SupabaseDrinkRepository } from '../../repository/DrinkRepository';
import { groupBy } from '../../utils';
import { HistoryItem } from './components/HistoryItem';
import EditHistoryEntryDialog from './dialog/EditHistoryEntryDialog';
import { fetchHistoryAsync } from './slices/drinksSlice';
import { HistoryScreenProps } from './types';

export const HistoryScreen = ({
  history,
  historyLoading,
  historyError,
  historyEndReached,
  user,
}: HistoryScreenProps) => {
  const dispatch = useAppDispatch();
  const notifications = useNotifications();

  const [editHistoryEntryOpen, setEditHistoryEntryOpen] = useState<boolean>(false);
  const [historyEntryToEdit, setHistoryEntryToEdit] = useState<FullHistory | null>(null);

  useEffect(() => {
    if (historyError)
      notifications.show(historyError, { severity: "error" });
  }, [historyError, notifications]);

  useEffect(() => {
    fetchForPage(0);
  }, []);

  const fetchForPage = (page: number) => {
    dispatch(fetchHistoryAsync({ userId: user.userId, page, count: 20 }));
  };

  const handleEntryUpdate = (newEntry: FullHistory) => {
    SupabaseDrinkRepository.updateHistoryItem(
      newEntry.id,
      newEntry.count ?? 0,
      (newEntry.count ?? 0) * (newEntry.drink.price ?? 1)
    )
      .then((result) => {
        setEditHistoryEntryOpen(false);
      })
      .catch((error) => {
        captureException(error);
        notifications.show(error, { severity: 'error' });
      });
  };

  const handleEntryOnClick = (entry: FullHistory) => {
    setHistoryEntryToEdit(entry);
    setEditHistoryEntryOpen(true);
  };

  return (
    <Layout>
      {historyLoading && <LinearProgress style={{ position: 'fixed', left: 0, top: 56, right: 0 }} />}
      {!historyLoading && history.length <= 0 && (
        <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
          <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>📖</Typography>
          <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Keine Einträge gefunden</Typography>
        </Box>
      )}
      <InfiniteScrollList fetch={fetchForPage} loading={historyLoading} endReached={historyEndReached}>
        {Array.from(
          groupBy(
            history.filter((x) => x.drink),
            (x: FullHistory) => moment(new Date(x.created_at ?? '')).format('DD MMMM yyyy')
          )
        ).map(([key, value]) => (
          <HistoryItem key={key} items={value} header={key} onClick={handleEntryOnClick} />
        ))}
      </InfiniteScrollList>
      <EditHistoryEntryDialog
        open={editHistoryEntryOpen}
        setOpen={() => setEditHistoryEntryOpen(true)}
        handleClose={() => setEditHistoryEntryOpen(false)}
        entry={historyEntryToEdit}
        handleSubmit={(newEntry) => handleEntryUpdate(newEntry)}
      />
    </Layout>
  );
};
