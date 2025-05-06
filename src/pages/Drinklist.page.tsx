import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  fetchDrinksAsync
} from 'src/features/drinks/slices/drinksSlice';
import { RootState, useAppDispatch } from 'src/redux/store';
import DrinkListScreen from '../features/drinks/DrinkListScreen';
import { useAuthentication } from 'src/features/auth/AuthContext';

const DrinkListScreenProvider = () => {
  const { user } = useAuthentication();
  const { drinks, drinksLoading, drinksError } = useSelector((state: RootState) => state.drinks);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchDrinksAsync());
  }, [dispatch]);

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
