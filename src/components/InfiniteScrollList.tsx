import { PropsWithChildren, useEffect, useRef } from 'react';

import List from '@mui/material/List';
import { FetchNextPageOptions, InfiniteData, InfiniteQueryObserverResult } from '@tanstack/react-query';

type InfiniteScrollListProps = PropsWithChildren & {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: (options?: FetchNextPageOptions) => Promise<
    InfiniteQueryObserverResult<
      InfiniteData<
        {
          data: unknown[];
          nextPage: number | undefined;
        },
        unknown
      >,
      Error
    >
  >;
};

export const InfiniteScrollList = ({ children, hasNextPage, isFetchingNextPage, fetchNextPage }: InfiniteScrollListProps) => {
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
    <div style={{ width: '100%' }}>
      <List sx={{ overflowY: 'auto', pb: 10 }}>
        {children}
        <div ref={loadMoreRef} style={{ height: 40 }} />
      </List>
    </div>
  );
};
