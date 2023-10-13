import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { drinksReducer } from './reducer/drinksReducer';
import { historyReducer } from './reducer/historyReducer';
import { OPEN } from '../constants';

export const drinksSlice = createSlice({
    name: 'drinks',
    initialState: {
        history: [],
        payment: {},
        drinks: [],
        paymentHistory: [],
        historyEndReached: false,
        historyError: null,
        historyLoading: false,
        drinksError: null,
        drinksLoading: false,
        paymentLoading: false,
        paymentError: null,
        paymentDrinksLoading: false,
        paymentDrinksError: null
    },
    reducers: {
        ...drinksReducer,
        ...historyReducer,
        onPaymentUpdated: (state, action) => {
            if (state.payment?.id === action.payload.new.id) {
                state.payment = action.payload.new;
            }
        },
        onPaymentDeleted: (state, action) => {
            if (state.payment?.id === action.payload.old.id) {
                state.payment = null;
            }
        },
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
            /**
             * Fetching active payment for user
             */
            .addCase(fetchPaymentAsync.pending, (state, action) => {
                state.paymentLoading = true;
            })
            .addCase(fetchPaymentAsync.fulfilled, (state, action) => {
                state.paymentLoading = false;
                state.paymentError = '';
                if (action.payload && action.payload.length === 1)
                    state.payment = action.payload[0]
            })
            .addCase(fetchPaymentAsync.rejected, (state, action) => {
                state.paymentLoading = false;
                state.paymentError = action.error.message;
                console.log(action.error);
            })

            .addCase(fetchDrinksToPayAsync.pending, (state, action) => {
                state.paymentDrinksLoading = true;
            })
            .addCase(fetchDrinksToPayAsync.fulfilled, (state, action) => {
                state.paymentDrinksLoading = false;
                state.paymentDrinksError = '';

                state.paymentHistory = action.payload;
            })
            .addCase(fetchDrinksToPayAsync.rejected, (state, action) => {
                state.paymentDrinksLoading = false;
                state.paymentDrinksError = action.error.message;
            })
    }
});

export const fetchPaymentAsync = createAsyncThunk("payments", async ({ client, user }) => {
    const response = await client.from("payments").select("*").eq("userId", user.id).eq("state", OPEN)
    return response.data;
});

export const fetchDrinksToPayAsync = createAsyncThunk("payments/openDrinks", async ({ client, user }) => {
    const response = await client
        .from("history")
        .select("id, count, created_at, user, amount, drink ( name, price ), payments ( state )")
        .eq('payments.state', OPEN)
        .not("payments", "is", null)
        .eq('user', user.id);
    return response.data;
});

export const fetchDrinksAsync = createAsyncThunk("drink", async (client) => {
    const response = await client.from("drink").select("id, name, price, stock, imageUrl, active, deleted, previousDrink")
        .order('id', { ascending: false })
    return response.data;
});

export const fetchHistoryAsync = createAsyncThunk("history", async ({ client, user, page = 0, count = 20 }) => {
    const response = await client
        .from("history")
        .select("id, count, amount, created_at, drinkId: drink")
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
    onDrinkDeleted,
    onPaymentDeleted,
    onPaymentUpdated } = drinksSlice.actions;

export default drinksSlice.reducer