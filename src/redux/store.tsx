import { configureStore } from '@reduxjs/toolkit'
import { useDispatch } from 'react-redux'
import adminDrinksSlice from './adminDrinksSlice'
import adminPaymentsSlice from './adminPaymentsSlice'
import adminUsersSlice from './adminUserSlice'
import applicationSlice from './applicationSlice'
import drinksSlice from './drinksSlice'
import eventSlice from './eventSlice'
import groupsSlice from './groupsSlice'
import keysSlice from './keysSlice'

const store = configureStore({
    reducer: {
        drinks: drinksSlice,
        events: eventSlice,
        groups: groupsSlice,
        application: applicationSlice,
        keys: keysSlice,
        adminDrinks: adminDrinksSlice,
        adminPayments: adminPaymentsSlice,
        adminUsers: adminUsersSlice
    },
});
export type RootState = ReturnType<typeof store.getState>

export type AppDispatch = typeof store.dispatch

export const useAppDispatch = () => useDispatch<AppDispatch>()

export default store;