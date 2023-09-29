import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { drinksReducer } from './reducer/drinksReducer';
import { historyReducer } from './reducer/historyReducer';

export const adminDrinksSlice = createSlice({
    name: 'admin-drinks',
    initialState: {
        history: [],
        drinks: [],
        historyEndReached: false,
        historyError: null,
        historyLoading: false,
        drinksError: null,
        drinksLoading: false
    },
    reducers: {
        ...drinksReducer,
        ...historyReducer
    },
    extraReducers(builder) {
        builder
            /**
             * Drinks initial loading
             */
            .addCase(fetchDrinksAsync.pending, (state, action) => {
                state.loading = true;
            })
            .addCase(fetchDrinksAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.drinksError = '';

                state.drinks = action.payload
            })
            .addCase(fetchDrinksAsync.rejected, (state, action) => {
                state.loading = false;
                state.drinksError = action.error.message;
            })
            /**
             * History initial loading
             */
            .addCase(fetchAdminHistoryAsync.pending, (state, action) => {
                state.loading = true;
            })
            .addCase(fetchAdminHistoryAsync.fulfilled, (state, action) => {
                console.log("reducer input", action.payload.entries)
                state.loading = false;
                state.historyError = '';

                if (action.payload.entries && action.payload.entries.length < 1) {
                    state.endReached = true
                }
                else {
                    state.endReached = false
                }

                if (action.payload.more) {
                    state.history = [...state.history, ...action.payload.entries];
                } else {
                    state.history = action.payload.entries;
                }
                console.log("reducer", state.history)
            })
            .addCase(fetchAdminHistoryAsync.rejected, (state, action) => {
                state.loading = false;
                state.endReached = true;
                state.historyError = action.error.message;
            })
    }
});

export const fetchDrinksAsync = createAsyncThunk("drink", async (client) => {
    const response = await client.from("drink").select("id, name, price, stock, imageUrl, active, deleted, previousDrink")
    return response.data;
});

export const fetchAdminHistoryAsync = createAsyncThunk("history", async ({ client, page = 0, count = 20 }) => {
    const response = await client
        .from("history")
        .select("count, amount, created_at, drinkId: drink, user(displayName)")
        .order('id', { ascending: false })
        .range(page * count, page * count + count - 1);
    console.log("fetch", response.data);
    return { entries: response.data, more: page !== 0 };
});

export const {
    onHistoryUpdate,
    onHistoryDelete,
    onHistoryInsert,
    onDrinkUpdated,
    onDrinkInserted,
    onDrinkDeleted } = adminDrinksSlice.actions;

export default adminDrinksSlice.reducer