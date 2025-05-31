import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';
import applicationSlice from './applicationSlice';
import { createReduxEnhancer } from '@sentry/react';


const sentryReduxEnhancer = createReduxEnhancer({
  // Optionally pass options listed below
});

const rootReducer = combineReducers({
  application: applicationSlice
});

export type RootState = ReturnType<typeof rootReducer>;

const store = configureStore({
  reducer: rootReducer,
  enhancers: (defaultEnhancers) => [...defaultEnhancers, sentryReduxEnhancer],
});

export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();

export default store;
