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
        ...historyReducer,
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
            .addCase(fetchHistoryAsync.pending, (state, action) => {
                state.loading = true;
            })
            .addCase(fetchHistoryAsync.fulfilled, (state, action) => {
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
            })
            .addCase(fetchHistoryAsync.rejected, (state, action) => {
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

export const fetchHistoryAsync = createAsyncThunk("history", async ({ client, user, page = 0, count = 20 }) => {
    const response = await client
        .from("history")
        .select("count, amount, created_at, drinkId: drink")
        .eq('user', user.id)
        .range(page * count, page * count + count - 1)
        .order('created_at', { ascending: false });
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