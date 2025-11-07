import { AdminDrinksRepository } from '@/repository/AdminDrinksRepository';
import { useInfiniteQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useEffect, useRef } from 'react';
import Layout from '../../components/layout/Layout';
import { AdminHistoryItem } from './components/AdminHistoryItem';

import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import groupBy from 'lodash.groupby';

const AdminHistoryScreen = () => {
  const {
    data: history,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['history', 'admin'],
    queryFn: AdminDrinksRepository.fetchAdminHistory,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

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

export default AdminHistoryScreen;
