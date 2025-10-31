import { useUpdateHistoryEntryMutation } from '@/tanstack/drinks';
import { captureException } from '@sentry/react';
import { useNotifications } from '@toolpad/core/useNotifications';
import { format } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { groupBy } from '../../utils';
import { HistoryItem } from './components/HistoryItem';
import EditHistoryEntryDialog from './dialog/EditHistoryEntryDialog';

import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';

export const HistoryScreen = ({ user, data: history, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage }
  : UseInfiniteQueryResult<InfiniteData<{ data: FullHistory[], nextPage?: number }>> & { user: User }) => {
  const notifications = useNotifications();

  const [editHistoryEntryOpen, setEditHistoryEntryOpen] = useState<boolean>(false);
  const [historyEntryToEdit, setHistoryEntryToEdit] = useState<FullHistory | null>(null);

  const updateEntry = useUpdateHistoryEntryMutation(user.userId);

  const handleEntryUpdate = (newEntry: FullHistory) => {
    updateEntry.mutate(newEntry, {
      onError: (error) => {
        captureException(error);
        notifications.show(error.message, { severity: 'error' });
      },
      onSuccess: () => {
        setEditHistoryEntryOpen(false);
      },
    });
  };

  const handleEntryOnClick = (entry: FullHistory) => {
    setHistoryEntryToEdit(entry);
    setEditHistoryEntryOpen(true);
  };

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    });

    const node = loadMoreRef.current;
    if (node) observer.observe(node);

    return () => {
      if (node) observer.unobserve(node);
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (isLoading) {
    return <LinearProgress style={{ position: 'fixed', left: 0, top: 56, right: 0 }} />;
  }

  if ((history?.pages.flatMap((x) => x.data) ?? []).length <= 0) {
    return (
      <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
        <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>📖</Typography>
        <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Keine Einträge gefunden</Typography>
      </Box>
    );
  }

  return (
    <>
      <List>
        {Array.from(
          groupBy(
            (history?.pages.flatMap((x) => x.data) ?? []).filter((x) => x.drink),
            (x: FullHistory) => format(x.created_at ?? '', 'dd MMMM yyyy')
          )
        ).map(([key, value]) => (
          <HistoryItem key={key} items={value} header={key} onClick={handleEntryOnClick} />
        ))}
      </List>
      {isFetchingNextPage && <p style={{ padding: '12px' }}>Lade mehr...</p>}
      <div ref={loadMoreRef} style={{ height: 40 }} />
      <EditHistoryEntryDialog
        open={editHistoryEntryOpen}
        setOpen={() => setEditHistoryEntryOpen(true)}
        handleClose={() => setEditHistoryEntryOpen(false)}
        entry={historyEntryToEdit}
        handleSubmit={(newEntry) => handleEntryUpdate(newEntry)}
      />
    </>
  );
};
