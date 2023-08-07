import { configureStore } from '@reduxjs/toolkit'
import drinkListReducer from './drinkListReducer'
import paymentReducer from './paymentReducer'
import historyReducer from './historyReducer'
import eventReducer from './eventReducer'
import applicationReducer from './applicationReducer'

export default configureStore({
    reducer: {
        drinks: drinkListReducer,
        payment: paymentReducer,
        history: historyReducer,
        events: eventReducer,
        application: applicationReducer,
    },
})