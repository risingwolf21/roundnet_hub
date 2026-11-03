import { useUpdateHistoryEntryMutation } from '@/tanstack/drinks';
import { captureException } from '@sentry/react';
import { format } from 'date-fns';
import { useEffect, useRef } from 'react';
import { groupBy } from '../../utils';

import { PullToRefresh } from '@/components/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { useDialogs } from '@/contexts/DialogsProvider';
import { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { t } from 'i18next';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import EditHistoryEntryDialog from './dialog/EditHistoryEntryDialog';

export const HistoryScreen = ({
  user,
  data: history,
  isLoading,
  refetch,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
}: UseInfiniteQueryResult<InfiniteData<{ data: FullHistory[]; nextPage?: number }>> & { user: User }) => {

  const updateEntry = useUpdateHistoryEntryMutation(user);

  const dialogs = useDialogs();

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
                      <Button variant={"outline"} size={"icon-lg"} onClick={async () => {
                        const result = await dialogs.open(EditHistoryEntryDialog, x);
                        if (result) {
                          updateEntry.mutate(result, {
                            onError: (error) => {
                              captureException(error);
                              toast.error(error.message);
                            },
                            onSuccess: () => {
                              toast.success(t('drinks.entryUpdated'));
                            },
                          });
                        }
                      }}>
                        <Pencil />
                      </Button>
                    </ItemActions>
                  </Item>)}
                </div>
              </div>
            ))}
          </div>
          {isFetchingNextPage && <p style={{ padding: '12px' }}>{t('drinks.loadMore')}</p>}
          <div ref={loadMoreRef} style={{ height: 40 }} />
        </PullToRefresh>
      </main>
    </div>
  );
};
