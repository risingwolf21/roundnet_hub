import { configureStore } from '@reduxjs/toolkit'
import applicationSlice from './applicationSlice'
import drinksSlice from './drinksSlice'
import adminDrinksSlice from './adminDrinksSlice'
import adminPaymentsSlice from './adminPaymentsSlice'
import eventReducer from './eventReducer'
import groupsSlice from './groupsSlice'
import adminUsersSlice from './adminUserSlice'

export default configureStore({
    reducer: {
        drinks: drinksSlice,
        events: eventReducer,
        groups: groupsSlice,
        application: applicationSlice,
        adminDrinks: adminDrinksSlice,
        adminPayments: adminPaymentsSlice,
        adminUsers: adminUsersSlice
    },
})