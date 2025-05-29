import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { SupabaseDrinkRepository } from 'src/repository/DrinkRepository';
import DrinkListScreen from '../features/drinks/DrinkListScreen';
import Layout from 'src/components/Layout';

export const useDrinks = () => useQuery({
  queryKey: ["drinks"],
  queryFn: SupabaseDrinkRepository.fetchDrinks
})

const DrinkListScreenProvider = () => {

  return <Layout>
    <DrinkListScreen />
  </Layout>
};

export default DrinkListScreenProvider;
