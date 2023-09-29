import { compareById } from "../../utils";

export const historyReducer = {
    onHistoryUpdate: (state, action) => {
        const index = state.history.findIndex((x) =>
            compareById(x, action.payload.new),
        )
        state.items = [
            ...state.history.slice(0, index),
            action.payload.new,
            ...state.history.slice(index + 1)
        ]
    },
    onHistoryDelete: (state, action) => {
        state.history = state.history.filter(x => !compareById(x, action.payload.old))
    },
    onHistoryInsert: (state, action) => {
        state.history = [...(state.history ?? []), action.payload.new]
    }
};