import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchDrinksAsync } from './drinkListReducer';
import { DRINK_DELETED, DRINK_INSERTED, DRINK_UPDATED } from './names';

const compareHistoryFn = (x, y) => {
    return x.id === y.id;
}

export const historyReducer = createSlice({
    name: 'history',
    initialState: {
        items: [],
        drinks: [],
        endReached: false,
        error: null,
        loading: false
    },
    reducers: {
        onHistoryUpdate: (state, action) => {
            const index = state.items.findIndex((x) =>
                compareHistoryFn(x, action.payload.new),
            )
            state.items = [
                ...state.items.slice(0, index),
                action.payload.new,
                ...state.items.slice(index + 1)
            ]
        },
        onHistoryDelete: (state, action) => {
            state.items = state.items.filter(x => !compareHistoryFn(x, action.payload.old))
        },
        onHistoryInsert: (state, action) => {
            state.items = [...(state.items ?? []), action.payload.new]
        }
    },
    extraReducers(builder) {
        builder
            /**
             * Drinks realtime updating
             */
            .addCase(DRINK_UPDATED, (state, action) => {
                const index = state.drinks.findIndex((x) =>
                    x.id === action.payload.new.id,
                )
                state.drinks = [
                    ...state.drinks.slice(0, index),
                    action.payload.new,
                    ...state.drinks.slice(index + 1)
                ]
            })
            .addCase(DRINK_DELETED, (state, action) => {
                state.drinks = state.drinks.filter(x => x.id !== action.payload.old)
            })
            .addCase(DRINK_INSERTED, (state, action) => {
                state.drinks = [...(state.drinks ?? []), action.payload.new]
            })
            /**
             * Drinks initial loading
             */
            .addCase(fetchDrinksAsync.pending, (state, action) => {
                state.loading = true;
            })
            .addCase(fetchDrinksAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.error = '';

                state.drinks = action.payload
            })
            .addCase(fetchDrinksAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            /**
             * History initial loading
             */
            .addCase(fetchHistoryAsync.pending, (state, action) => {
                state.loading = true;
            })
            .addCase(fetchHistoryAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.error = '';

                if (action.payload.entries && action.payload.entries.length < 1) {
                    state.endReached = true
                }
                else {
                    state.endReached = false
                }

                if (action.payload.more) {
                    state.items = [...state.items, ...action.payload.entries];
                } else {
                    state.items = action.payload.entries;
                }
            })
            .addCase(fetchHistoryAsync.rejected, (state, action) => {
                state.loading = false;
                state.endReached = true;
                state.error = action.error.message;
            })
    }
});

export const fetchHistoryAsync = createAsyncThunk("history", async ({ client, user, page = 0, count = 20 }) => {
    const response = await client
        .from("history")
        .select("count, amount, created_at, drinkId: drink")
        .eq('user', user.id)
        .range(page * count, page * count + count - 1)
        .order('created_at', { ascending: false });
    return { entries: response.data, more: page !== 0 };
});

export const { onHistoryUpdate, onHistoryDelete, onHistoryInsert } = historyReducer.actions;

export default historyReducer.reducer