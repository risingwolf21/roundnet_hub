import { format } from 'date-fns';
import { useEffect, useRef } from 'react';
import Layout from '../../components/layout/Layout';
import { AdminHistoryItem } from './components/AdminHistoryItem';

import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { Item, ItemActions, ItemContent, ItemMedia } from '@/components/ui/item';
import { useInfiniteDrinkHistory } from '@/tanstack/admin';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import groupBy from 'lodash.groupby';
import { useGrants } from '../auth/GrantsContext';

const AdminHistoryScreenShadcn = () => {
  const { data: history, refetch, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteDrinkHistory();
  const { user } = useGrants();
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


  return <div>
    <AppBar
      className='!border-b !shadow-sm'
      title={"Admin Getränke Verlauf"}
      user={user}
    />
    <main className='flex-1 size-full pb-safe-bottom'>
      <PullToRefresh onRefresh={() => refetch()}>
        <div>
          {Object.entries(
            groupBy(history?.pages.flatMap((x) => x.data) ?? [], (x: FullHistory) =>
              format(x.created_at ?? '', 'dd MMMM yyyy')
            )
          ).map(([key, value]) => (
            <div key={key}>
              <div className='text-sm font-bold p-2'>{key}</div>
              <div>
                {
                  value.map(x => (
                    <Item key={x.id} className='border-b'>
                      <ItemMedia className='mr-2'>
                        <div>{x.count}x</div>
                      </ItemMedia>
                      <ItemContent>
                        <div>
                          <div>{x.drink.name}</div>
                          <div>{x.user.name}</div>
                        </div>
                      </ItemContent>
                      <ItemActions>
                        <div className='font-bold'>{(x.drink?.price ?? 0) * (x.count ?? 0)} €</div>
                      </ItemActions>
                    </Item>
                  ))
                }
              </div>
            </div>
          ))}
        </div>
      </PullToRefresh>
    </main>
  </div>

  return (
    <Layout>
      {isLoading && <LinearProgress style={{ position: 'fixed', left: 0, top: 56, right: 0 }} />}
      <List>
        {Object.entries(
          groupBy(history?.pages.flatMap((x) => x.data) ?? [], (x: FullHistory) =>
            format(x.created_at ?? '', 'dd MMMM yyyy')
          )
        ).map(([key, value]) => (
          <AdminHistoryItem key={key} items={value} header={key} />
        ))}
      </List>
      {isFetchingNextPage && <p style={{ padding: '12px' }}>Lade mehr...</p>}
      <div ref={loadMoreRef} style={{ height: 40 }} />
    </Layout>
  );
};

export default AdminHistoryScreenShadcn;
