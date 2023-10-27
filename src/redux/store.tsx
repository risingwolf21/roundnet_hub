import { configureStore } from '@reduxjs/toolkit'
import applicationSlice from './applicationSlice'
import drinksSlice from './drinksSlice'
import adminDrinksSlice from './adminDrinksSlice'
import adminPaymentsSlice from './adminPaymentsSlice'
import eventSlice from './eventSlice'
import groupsSlice from './groupsSlice'
import adminUsersSlice from './adminUserSlice'

const store = configureStore({
    reducer: {
        drinks: drinksSlice,
        events: eventSlice,
        groups: groupsSlice,
        application: applicationSlice,
        adminDrinks: adminDrinksSlice,
        adminPayments: adminPaymentsSlice,
        adminUsers: adminUsersSlice
    },
});
export type RootState = ReturnType<typeof store.getState>

export default store;