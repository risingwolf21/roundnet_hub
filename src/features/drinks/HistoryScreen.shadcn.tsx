import { useUpdateHistoryEntryMutation } from '@/tanstack/drinks';
import { captureException } from '@sentry/react';
import { format } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { groupBy } from '../../utils';
import EditHistoryEntryDialog from './dialog/EditHistoryEntryDialog';

import { PullToRefresh } from '@/components/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { t } from 'i18next';
import { toast } from 'sonner';

export const HistoryScreenShadcn = ({
  user,
  data: history,
  isLoading,
  refetch,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
}: UseInfiniteQueryResult<InfiniteData<{ data: FullHistory[]; nextPage?: number }>> & { user: User }) => {

  const [editHistoryEntryOpen, setEditHistoryEntryOpen] = useState<boolean>(false);
  const [historyEntryToEdit, setHistoryEntryToEdit] = useState<FullHistory | null>(null);

  const updateEntry = useUpdateHistoryEntryMutation(user);

  const handleEntryUpdate = (newEntry: FullHistory) => {
    updateEntry.mutate(newEntry, {
      onError: (error) => {
        captureException(error);
        toast.error(error.message);
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

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title={t("drinks.drinks")}
        user={user}
      />
      <main className='flex-1 size-full pb-safe-bottom'>
        <PullToRefresh
          onRefresh={() => {
            refetch();
          }}>
          <div>
            {Array.from(
              groupBy(
                (history?.pages.flatMap((x) => x.data) ?? []).filter((x) => x.drink),
                (x: FullHistory) => format(x.created_at ?? '', 'dd MMMM yyyy')
              )
            ).map(([key, value]) => (
              <div key={key}>
                <div className="text-sm font-semibold ml-2">
                  {key}
                </div>
                <div className='p-2 gap-2 flex flex-col'>
                  {value.map(x => <Item key={x.id} variant={"outline"} className='py-1'>
                    <div className='text-base'>{x.count}x</div>
                    <ItemContent>
                      <ItemTitle>
                        {x.drink.name}
                      </ItemTitle>
                      <ItemDescription>
                        {format(x.created_at ?? '', 'HH:mm')}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <div className='text-sm'>{(x.count ?? 0) * (x.drink?.price ?? 1)} €</div>
                    </ItemActions>
                  </Item>)}
                </div>
              </div>
            ))}
          </div>
          {isFetchingNextPage && <p style={{ padding: '12px' }}>Lade mehr...</p>}
          <div ref={loadMoreRef} style={{ height: 40 }} />
          <EditHistoryEntryDialog
            open={editHistoryEntryOpen}
            setOpen={() => setEditHistoryEntryOpen(true)}
            handleClose={() => setEditHistoryEntryOpen(false)}
            entry={historyEntryToEdit}
            handleSubmit={(newEntry) => handleEntryUpdate(newEntry)}
          />
        </PullToRefresh>
      </main>
    </div>
  );
};
