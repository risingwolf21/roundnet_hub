import React from 'react';
import Layout from 'src/components/Layout';
import { useAuthentication } from '../auth/AuthContext';
import { HistoryScreen } from './HistoryScreen';

const HistoryScreenProvider = () => {
  const { user } = useAuthentication();

  return <Layout>
    <HistoryScreen user={user} />
  </Layout>
};

export default HistoryScreenProvider;
