import { CircularProgress } from '@mui/material';
import React, { createRef, ReactNode, useState } from 'react';

type Props = {
  children: ReactNode;
  indicatorSize?: number;
  maxDrag?: number;
  onRefresh: () => void;
  topOffset?: number;
};

export const PullToRefresh = ({
  onRefresh,
  children = null,
  indicatorSize = 50,
  maxDrag = 200,
  topOffset = 64,
}: Props) => {
  const ref = createRef<HTMLDivElement>();
  const [busy, setBusy] = useState<boolean>(false);
  const [touchStart, setTouchStart] = useState<React.Touch | null>(null);
  const [drag, setDrag] = useState<number>(0);
  const [dragging, setDragging] = useState<boolean>(false);

  const reset = () => {
    setBusy(false);
    setTouchStart(null);
    setDrag(0);
    setDragging(false);
  };

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!busy && ref.current && ref.current.scrollTop <= topOffset) {
      setTouchStart(event.touches[0]);
    }
  };

  const onTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (!touchStart) {
      return;
    }
    const drag = Math.max(0, event.touches[0].clientY - touchStart.clientY);
    if (drag !== 0) {
      setDrag(Math.min(drag, maxDrag));
      setDragging(true);
    } else if (!dragging) {
      reset();
    }
  };

  const onTouchEnd = () => {
    if (!busy) {
      if (drag >= maxDrag * 0.9) {
        setBusy(true);
        setDrag(maxDrag / 2);
        setTouchStart(null);
        Promise.resolve().then(onRefresh).then(reset, reset);
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
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        style={{
          width: '100%',
          height: `${indicatorSize * (busy ? 1 : Math.min(drag, maxDrag) / maxDrag)}px`,
          display: dragging || busy ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress
          thickness={5}
          size={indicatorSize * 0.6}
          variant="indeterminate"
          sx={{ transition: 'none' }}
        />
      </div>
      {children}
    </div>
  );
};
