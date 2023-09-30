import { configureStore } from '@reduxjs/toolkit'
import paymentSlice from './paymentSlice'
import applicationSlice from './applicationSlice'
import drinksSlice from './drinksSlice'
import adminDrinksSlice from './adminDrinksSlice'
import adminPaymentsSlice from './adminPaymentsSlice'

export default configureStore({
    reducer: {
        drinks: drinksSlice,
        payment: paymentSlice,
        application: applicationSlice,
        adminDrinks: adminDrinksSlice,
        adminPayments: adminPaymentsSlice
    },
})