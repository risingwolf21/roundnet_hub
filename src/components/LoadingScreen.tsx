import React from 'react';
import { LoadingIndicator } from './LoadingIndicator';
import Layout from './Layout';

export const LoadingScreen = () => {
  return (
    <Layout>
      <LoadingIndicator loading={true} />
    </Layout>
  );
};
