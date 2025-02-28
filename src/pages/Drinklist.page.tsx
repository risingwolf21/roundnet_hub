import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  fetchDrinksAsync
} from 'src/features/drinks/slices/drinksSlice';
import { RootState, useAppDispatch } from 'src/redux/store';
import { useApplication } from '../features/auth/AuthContext';
import DrinkListScreen from '../features/drinks/DrinkListScreen';

const DrinkListScreenProvider = () => {
  const { user } = useApplication();
  const { drinks, drinksLoading, drinksError } = useSelector((state: RootState) => state.drinks);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchDrinksAsync());
  }, [dispatch]);

  return (
    <DrinkListScreen
      dispatch={dispatch}
      user={user!}
      drinks={drinks}
      drinksError={drinksError ?? ''}
      drinksLoading={drinksLoading}
    />
  );
};

export default DrinkListScreenProvider;
