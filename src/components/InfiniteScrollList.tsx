import { useEffect, useRef } from 'react';

import List from '@mui/material/List';

type InfiniteScrollListProps = {
  fetch: (page: number) => any;
  loading: boolean;
  endReached: boolean;
  children: any;
};

export const InfiniteScrollList = ({ children, fetch, loading, endReached }: InfiniteScrollListProps) => {
  const observerTarget = useRef(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let pagesCounter = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !endReached && !loading) {
          fetch(pagesCounter);
          pagesCounter++;
        }
      },
      { threshold: 1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [observerTarget]);

  return (
    <div style={{ width: '100%' }}>
      <List sx={{ overflowY: 'auto', pb: 10 }}>
        {children}
        <div ref={observerTarget}></div>
      </List>
    </div>
  );
};
