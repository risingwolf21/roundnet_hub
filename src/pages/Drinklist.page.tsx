import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  fetchDrinksAsync,
  onDrinkDeleted,
  onDrinkInserted,
  onDrinkUpdated,
} from 'src/features/drinks/slices/drinksSlice';
import { RootState, useAppDispatch } from 'src/redux/store';
import DrinkListScreen from '../features/drinks/DrinkListScreen';
import { TablesInsert, TablesUpdate } from '../types/supabase-generated.types';
import { useClient } from 'react-supabase';
import { useAuth } from '../features/auth/AuthContext';

const DrinkListScreenProvider = () => {
  const user = useAuth();
  const { drinks, drinksLoading, drinksError } = useSelector((state: RootState) => state.drinks);
  const dispatch = useAppDispatch();
  const client = useClient();

  useEffect(() => {
    dispatch(fetchDrinksAsync());
  }, [dispatch]);

  useEffect(() => {
    let subscription = client
      .channel('public:drink')
      .on<TablesUpdate<'drink'>>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drink',
        },
        (payload) => dispatch(onDrinkUpdated(payload.new))
      )
      .on<TablesInsert<'drink'>>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'drink',
        },
        (payload) => dispatch(onDrinkInserted(payload.new))
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'drink',
        },
        (payload) => dispatch(onDrinkDeleted(payload.old.id))
      )
      .subscribe();
    return () => {
      subscription.unsubscribe();
    };
  }, [client, dispatch]);

  return (
    <DrinkListScreen
      dispatch={dispatch}
      user={user}
      drinks={drinks}
      drinksError={drinksError ?? ''}
      drinksLoading={drinksLoading}
    />
  );
};

export default DrinkListScreenProvider;
