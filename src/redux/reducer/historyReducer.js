import { compareById } from "../../utils";

export const historyReducer = {
    onHistoryUpdate: (state, action) => {

        let drinkIndex = state.drinks.findIndex(x => x.id === action.payload.new.drink);
        let newHistoryEntry = action.payload.new;
        if (drinkIndex !== -1) {
            newHistoryEntry = Object.assign(newHistoryEntry, { drink: state.drinks[drinkIndex], drinkId: action.payload.new.drink });
        }

        let index = state.history.findIndex((x) =>
            compareById(x, newHistoryEntry),
        )

        state.history = [
            ...state.history.slice(0, index),
            newHistoryEntry,
            ...state.history.slice(index + 1)
        ]

        index = state.paymentHistory.findIndex((x) =>
            compareById(x, newHistoryEntry),
        )

        if (index !== -1)
            state.paymentHistory = [
                ...state.paymentHistory.slice(0, index),
                newHistoryEntry,
                ...state.paymentHistory.slice(index + 1)
            ]
    },
    onHistoryDelete: (state, action) => {
        state.history = state.history.filter(x => !compareById(x, action.payload.old))
        state.paymentHistory = state.paymentHistory.filter(x => !compareById(x, action.payload.old))
    },
    onHistoryInsert: (state, action) => {
        state.history = [...(state.history ?? []), action.payload.new]
        if (action.payload.new.payment === state.payment?.id)
            state.paymentHistory = [...(state.history ?? []), action.payload.new]
    }
};