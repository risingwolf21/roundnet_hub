import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useClient } from 'react-supabase';
import { onHistoryDelete, onHistoryInsert, onHistoryUpdate } from './slices/drinksSlice';
import { RootState, useAppDispatch } from '../../redux/store';
import { AlertSnackbar } from '../../components/AlertSnackbar';
import { HistoryScreen } from './HistoryScreen';
import { useAuth } from '../auth/AuthContext';

const HistoryScreenProvider = () => {
  const { history, drinks, historyLoading, historyError, historyEndReached } = useSelector(
    (state: RootState) => state.drinks
  );
  const client = useClient();
  const dispatch = useAppDispatch();

  const user = useAuth();

  useEffect(() => {
    let subscription = client
      .channel('public:history')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'history',
          filter: 'user=eq.' + user.userId,
        },
        (payload) => dispatch(onHistoryUpdate(payload))
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'history',
          filter: 'user=eq.' + user.userId,
        },
        (payload) => dispatch(onHistoryDelete(payload))
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'history',
          filter: 'user=eq.' + user.userId,
        },
        (payload) => dispatch(onHistoryInsert(payload))
      )
      .subscribe();
    return () => {
      subscription.unsubscribe();
    };
  }, [client, dispatch, user]);

  if (!user)
    return (
      <AlertSnackbar
        close={() => {}}
        alertInfo={{ message: 'Fatal error occured. Repository or user was null!', severity: 'error' }}
      />
    );

  return (
    <HistoryScreen
      history={history}
      drinks={drinks}
      historyEndReached={historyEndReached}
      historyError={historyError ?? ''}
      historyLoading={historyLoading}
      user={user}
    />
  );
};

export default HistoryScreenProvider;
