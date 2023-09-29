import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { OPEN } from '../constants';

const compareDrinksFn = (x, y) => {
    return x.id === y.id;
}

export const paymentReducer = createSlice({
    name: 'payment',
    initialState: {
        payment: null,
        drinks: [],
        drinksError: null,
        drinksLoading: false,
        error: null,
        loading: false
    },
    reducers: {
        onDrinksUpdate: (state, action) => {
            const index = state.items.findIndex((x) =>
                compareDrinksFn(x, action.payload.new),
            )
            state.items = [
                ...state.items.slice(0, index),
                action.payload.new,
                ...state.items.slice(index + 1)
            ]
        },
        onDrinksDelete: (state, action) => {
            state.items = state.items.filter(x => !compareDrinksFn(x, action.payload.old))
        },
        onDrinksInsert: (state, action) => {
            state.items = [...(state.items ?? []), action.payload.new]
        },
    },
    extraReducers(builder) {
        builder
            .addCase(fetchPaymentAsync.pending, (state, action) => {
                state.loading = true;
            })
            .addCase(fetchPaymentAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.error = '';
                if (action.payload && action.payload.length > 0)
                    state.payment = action.payload[0]
            })
            .addCase(fetchPaymentAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })

            .addCase(fetchDrinkToPayAsync.pending, (state, action) => {
                state.drinksLoading = true;
            })
            .addCase(fetchDrinkToPayAsync.fulfilled, (state, action) => {
                state.drinksLoading = false;
                state.drinksError = '';

                state.drinks = action.payload;
            })
            .addCase(fetchDrinkToPayAsync.rejected, (state, action) => {
                state.drinksLoading = false;
                state.drinksError = action.error.message;
            })
    }
});

export const fetchPaymentAsync = createAsyncThunk("payments", async ({ client, user }) => {
    const response = await client.from("payments").select("*").eq("userId", user.id).eq("state", OPEN)
    return response.data;
});

export const fetchDrinkToPayAsync = createAsyncThunk("payments/openDrinks", async ({ client, user }) => {
    const response = await client
        .from("history")
        .select("id, count, created_at, user, amount, drink ( name, price ), payments ( state )")
        .eq('payments.state', OPEN)
        .not("payments", "is", null)
        .eq('user', user.id);
    return response.data;
});

export default paymentReducer.reducer