import { configureStore } from '@reduxjs/toolkit'
import drinkListReducer from './drinkListReducer'

export default configureStore({
    reducer: {
        drinkList: drinkListReducer
    },
})