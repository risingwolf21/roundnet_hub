import { configureStore } from '@reduxjs/toolkit'
import applicationSlice from './applicationSlice'
//@ts-ignore
import drinksSlice from './drinksSlice'
import adminDrinksSlice from './adminDrinksSlice'
import adminPaymentsSlice from './adminPaymentsSlice'
//@ts-ignore
import eventReducer from './eventReducer'
//@ts-ignore
import groupsSlice from './groupsSlice'
//@ts-ignore
import adminUsersSlice from './adminUserSlice'

const store = configureStore({
    reducer: {
        drinks: drinksSlice,
        events: eventReducer,
        groups: groupsSlice,
        application: applicationSlice,
        adminDrinks: adminDrinksSlice,
        adminPayments: adminPaymentsSlice,
        adminUsers: adminUsersSlice
    },
});
export type RootState = ReturnType<typeof store.getState>

export default store;