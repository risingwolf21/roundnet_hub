import { compareById } from "../../utils"

export const drinksReducer = {
    onDrinkUpdated: (state, action) => {
        const index = state.drinks.findIndex((x) =>
            x.id === action.payload.new.id,
        )
        state.drinks = [
            ...state.drinks.slice(0, index),
            action.payload.new,
            ...state.drinks.slice(index + 1)
        ]
    },
    onDrinkDeleted: (state, action) => {
        state.drinks = state.drinks.filter(x => !compareById(x, action.payload.old))
    },
    onDrinkInserted: (state, action) => {
        state.drinks = [...(state.drinks ?? []), action.payload.new]
    }
}