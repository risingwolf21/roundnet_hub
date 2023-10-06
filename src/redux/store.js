import { configureStore } from '@reduxjs/toolkit'
import applicationSlice from './applicationSlice'
import drinksSlice from './drinksSlice'
import adminDrinksSlice from './adminDrinksSlice'
import adminPaymentsSlice from './adminPaymentsSlice'

export default configureStore({
    reducer: {
        drinks: drinksSlice,
        application: applicationSlice,
        adminDrinks: adminDrinksSlice,
        adminPayments: adminPaymentsSlice,
    },
})