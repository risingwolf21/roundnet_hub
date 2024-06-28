import {configureStore} from '@reduxjs/toolkit'
import {useDispatch} from 'react-redux'
import adminDrinksSlice from './adminDrinksSlice'
import adminPaymentsSlice from './adminPaymentsSlice'
import adminUsersSlice from './adminUserSlice'
import applicationSlice from './applicationSlice'
import drinksSlice from './drinksSlice'
import groupsSlice from './groupsSlice'
import keysSlice from './keysSlice'
import notificationsSlice from './notificationsSlice'
import eventAttendanceSlice from './events/eventAttendanceSlice'
import eventCommentsSlice from './events/eventCommentsSlice'
import eventsSlice from './events/eventsSlice'
import {createReduxEnhancer} from "@sentry/react";
import challengeSlice from "./challengeSlice";

const sentryReduxEnhancer = createReduxEnhancer({
    // Optionally pass options listed below
});

const store = configureStore({
    reducer: {
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
        challenges: challengeSlice
    },
    enhancers: defaultEnhancers => [...defaultEnhancers, sentryReduxEnhancer]
});
export type RootState = ReturnType<typeof store.getState>

export type AppDispatch = typeof store.dispatch

export const useAppDispatch = () => useDispatch<AppDispatch>()

export default store;