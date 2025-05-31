import React from 'react';
import Layout from 'src/components/Layout';
import DrinkListScreen from './DrinkListScreen';

const DrinkListScreenProvider = () => {

  return <Layout>
    <DrinkListScreen />
  </Layout>
};

export default DrinkListScreenProvider;
