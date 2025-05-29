import { Box, LinearProgress, List, Typography } from '@mui/material';
import { captureException } from '@sentry/react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNotifications } from '@toolpad/core/useNotifications';
import moment from 'moment/moment';
import React, { useEffect, useRef, useState } from 'react';
import { SupabaseDrinkRepository } from '../../repository/DrinkRepository';
import { groupBy } from '../../utils';
import { HistoryItem } from './components/HistoryItem';
import EditHistoryEntryDialog from './dialog/EditHistoryEntryDialog';

export const HistoryScreen = ({
  user,
}: { user: User }) => {
  const notifications = useNotifications();

  const [editHistoryEntryOpen, setEditHistoryEntryOpen] = useState<boolean>(false);
  const [historyEntryToEdit, setHistoryEntryToEdit] = useState<FullHistory | null>(null);

  const { data: history, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["history", "admin"],
    queryFn: ({ pageParam }) => SupabaseDrinkRepository.fetchHistoryForUser(user.userId, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0
  });

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

  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    })

    const node = loadMoreRef.current
    if (node) observer.observe(node)

    return () => {
      if (node) observer.unobserve(node)
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  if (isLoading) {
    return <LinearProgress style={{ position: 'fixed', left: 0, top: 56, right: 0 }} />
  }

  if ((history?.pages.flatMap(x => x.data) ?? []).length <= 0) {
    return <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
      <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>📖</Typography>
      <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Keine Einträge gefunden</Typography>
    </Box>
  }

  return <>
    <List>
      {Array.from(
        groupBy(
          (history?.pages.flatMap(x => x.data) ?? []).filter((x) => x.drink),
          (x: FullHistory) => moment(new Date(x.created_at ?? '')).format('DD MMMM yyyy')
        )
      ).map(([key, value]) => (
        <HistoryItem key={key} items={value} header={key} onClick={handleEntryOnClick} />
      ))}
    </List>
    {isFetchingNextPage && <p style={{ padding: "12px" }}>Lade mehr...</p>}
    <div ref={loadMoreRef} style={{ height: 40 }} />
    <EditHistoryEntryDialog
      open={editHistoryEntryOpen}
      setOpen={() => setEditHistoryEntryOpen(true)}
      handleClose={() => setEditHistoryEntryOpen(false)}
      entry={historyEntryToEdit}
      handleSubmit={(newEntry) => handleEntryUpdate(newEntry)}
    />
  </>
};
