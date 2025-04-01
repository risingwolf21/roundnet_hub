import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';
import adminDrinksSlice from '../features/admin/slices/adminDrinksSlice';
import adminPaymentsSlice from '../features/admin/slices/adminPaymentsSlice';
import adminUsersSlice from '../features/admin/slices/adminUserSlice';
import applicationSlice from './applicationSlice';
import drinksSlice from '../features/drinks/slices/drinksSlice';
import groupsSlice from '../features/groups/slices/groupsSlice';
import keysSlice from '../features/keys/slices/keysSlice';
import notificationsSlice from '../features/notifications/slices/notificationsSlice';
import eventAttendanceSlice from '../features/events/slices/eventAttendanceSlice';
import eventCommentsSlice from '../features/events/slices/eventCommentsSlice';
import eventsSlice from '../features/events/slices/eventsSlice';
import { createReduxEnhancer } from '@sentry/react';
import challengeSlice from '../features/challenges/slices/challengeSlice';
import gamesSlice from '../features/games/slices/gamesSlice';


const sentryReduxEnhancer = createReduxEnhancer({
  // Optionally pass options listed below
});

const rootReducer = combineReducers({
  drinks: drinksSlice,
  groups: groupsSlice,
  application: applicationSlice,
  keys: keysSlice,
  adminDrinks: adminDrinksSlice,
  adminPayments: adminPaymentsSlice,
  adminUsers: adminUsersSlice,
  events: eventsSlice,
  eventAttendance: eventAttendanceSlice,
  eventComments: eventCommentsSlice,
  notifications: notificationsSlice,
  challenges: challengeSlice,
  games: gamesSlice,
});

export type RootState = ReturnType<typeof rootReducer>;

const store = configureStore({
  reducer: rootReducer,
  enhancers: (defaultEnhancers) => [...defaultEnhancers, sentryReduxEnhancer],
});

export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();

export default store;
