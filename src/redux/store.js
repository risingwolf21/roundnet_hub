import { configureStore } from '@reduxjs/toolkit'
import paymentReducer from './paymentReducer'
import applicationReducer from './applicationReducer'
import drinksSlice from './drinksSlice'

export default configureStore({
    reducer: {
        drinks: drinksSlice,
        payment: paymentReducer,
        application: applicationReducer,
    },
})