import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';
import adminDrinksSlice from '../features/admin/slices/adminDrinksSlice';
import adminPaymentsSlice from '../features/admin/slices/adminPaymentsSlice';
import adminUsersSlice from '../features/admin/slices/adminUserSlice';
import applicationSlice from './applicationSlice';
import drinksSlice from '../features/drinks/slices/drinksSlice';
import notificationsSlice from '../features/notifications/slices/notificationsSlice';
import { createReduxEnhancer } from '@sentry/react';


const sentryReduxEnhancer = createReduxEnhancer({
  // Optionally pass options listed below
});

const rootReducer = combineReducers({
  drinks: drinksSlice,
  application: applicationSlice,
  adminDrinks: adminDrinksSlice,
  adminPayments: adminPaymentsSlice,
  adminUsers: adminUsersSlice,
  notifications: notificationsSlice
});

export type RootState = ReturnType<typeof rootReducer>;

const store = configureStore({
  reducer: rootReducer,
  enhancers: (defaultEnhancers) => [...defaultEnhancers, sentryReduxEnhancer],
});

export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();

export default store;
