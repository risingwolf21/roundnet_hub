import React, { ReactNode, useEffect, useRef, useState } from 'react';

import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CircularProgress from '@mui/material/CircularProgress';
type Props = {
  children: ReactNode;
  indicatorSize?: number;
  maxDrag?: number;
  onRefresh: () => void;
};

export const PullToRefresh = ({ onRefresh, children = null, indicatorSize = 80, maxDrag = 250 }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [touchStart, setTouchStart] = useState<React.Touch | null>(null);
  const [drag, setDrag] = useState<number>(0);
  const [isOnTop, setIsOnTop] = useState(true);

  const observerTarget = useRef(null);

  useEffect(() => {
    const current = observerTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        setIsOnTop(entries[0].isIntersecting);
      },
      { threshold: 1 }
    );

    if (current) {
      observer.observe(current);
    }

    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [observerTarget]);

  const k = 2.5;
  function appr(x: number) {
    return maxDrag * (1 - Math.exp((-k * x) / maxDrag));
  }

  const reset = () => {
    setBusy(false);
    setTouchStart(null);
    setDrag(0);
  };

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    // check if dialog container exists -> any dialog is open
    if (document.querySelector('.MuiDialog-container')) return;
    if (!busy && isOnTop) {
      setTouchStart(event.touches[0]);
    }
  };

  const onTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (!touchStart) {
      return;
    }
    const dy = event.touches[0].clientY - touchStart.clientY;
    if (dy < 0) setDrag(0);
    else setDrag(appr(dy));
  };

  const onTouchEnd = () => {
    if (!busy) {
      if (drag >= maxDrag * 0.9) {
        setBusy(true);
        setDrag(maxDrag / 2);
        setTouchStart(null);
        new Promise((resolve) => setTimeout(resolve, 1000)).then(onRefresh).finally(reset);
      } else {
        reset();
      }
    }
  };

  return (
    <div
      ref={ref}
      style={{
        overflowY: 'hidden',
        height: '100%',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        style={{
          width: '100%',
          height: `${indicatorSize * (busy ? 1 : Math.min(drag, maxDrag) / maxDrag)}px`,
          display: drag > 0 || busy ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'white',
          backgroundImage: 'radial-gradient(#80888888 1px, transparent 0)',
          backgroundSize: '20px 20px',
          backgroundPosition: '-19px -19px',
        }}
      >
        {busy && <CircularProgress thickness={5} size={30} variant="indeterminate" sx={{ transition: 'none' }} />}
        {drag < maxDrag * 0.9 && drag > 50 && !busy && <ArrowDownwardIcon />}
        {drag >= maxDrag * 0.9 && !busy && <ArrowUpwardIcon />}
      </div>
      <div className="scroll-container" style={{ overscrollBehavior: 'none', height: '100%' }}>
        <div ref={observerTarget}></div>
        {children}
      </div>
    </div>
  );
};
