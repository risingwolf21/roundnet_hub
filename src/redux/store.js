import { configureStore } from '@reduxjs/toolkit'
import paymentSlice from './paymentSlice'
import applicationSlice from './applicationSlice'
import drinksSlice from './drinksSlice'
import adminDrinksSlice from './adminDrinksSlice'
import adminPaymentsSlice from './adminPaymentsSlice'
import eventReducer from './eventReducer'
import groupsSlice from './groupsSlice'

export default configureStore({
    reducer: {
        drinks: drinksSlice,
        payment: paymentSlice,
        events: eventReducer,
        groups: groupsSlice,
        application: applicationSlice,
        adminDrinks: adminDrinksSlice,
        adminPayments: adminPaymentsSlice,
    },
})