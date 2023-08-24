import { configureStore } from '@reduxjs/toolkit'
import drinkListReducer from './drinkListReducer'
import paymentReducer from './paymentReducer'
import historyReducer from './historyReducer'
import applicationReducer from './applicationReducer'

export default configureStore({
    reducer: {
        drinks: drinkListReducer,
        payment: paymentReducer,
        history: historyReducer,
        application: applicationReducer
    },
})