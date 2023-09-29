import { compareById } from "../../utils";

export const historyReducer = {
    onHistoryUpdate: (state, action) => {
        const index = state.items.findIndex((x) =>
            compareById(x, action.payload.new),
        )
        state.items = [
            ...state.items.slice(0, index),
            action.payload.new,
            ...state.items.slice(index + 1)
        ]
    },
    onHistoryDelete: (state, action) => {
        state.items = state.items.filter(x => !compareById(x, action.payload.old))
    },
    onHistoryInsert: (state, action) => {
        state.items = [...(state.items ?? []), action.payload.new]
    }
};