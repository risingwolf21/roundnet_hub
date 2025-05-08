import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { useAuthentication } from '../auth/AuthContext';
import { HistoryScreen } from './HistoryScreen';

const HistoryScreenProvider = () => {
  const { history, historyLoading, historyError, historyEndReached } = useSelector((state: RootState) => state.drinks);
  const { user } = useAuthentication();

  return (
    <HistoryScreen
      history={history}
      historyEndReached={historyEndReached}
      historyError={historyError ?? ''}
      historyLoading={historyLoading}
      user={user}
    />
  );
};

export default HistoryScreenProvider;
