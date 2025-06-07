import React from 'react';
import Layout from 'src/components/layout/Layout';
import { useAuthentication } from '../auth/AuthProvider';
import { HistoryScreen } from './HistoryScreen';

const HistoryScreenProvider = () => {
  const { user } = useAuthentication();

  return <Layout>
    <HistoryScreen user={user} />
  </Layout>
};

export default HistoryScreenProvider;
