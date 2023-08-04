import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { OPEN } from '../constants';

export const paymentReducer = createSlice({
    name: 'payment',
    initialState: {
        payment: null,
        error: null,
        loading: false
    },
    extraReducers(builder) {
        builder
            .addCase(fetchPaymentAsync.pending, (state, action) => {
                state.loading = true;
            })
            .addCase(fetchPaymentAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.error = '';
                state.payment = action.payload[0] ?? null;
            })
            .addCase(fetchPaymentAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
    }
});

export const fetchPaymentAsync = createAsyncThunk("payments", async ({ client, user }) => {
    const response = await client.from("payments").select("*").eq("userId", user.id).eq("state", OPEN)
    return response.data;
});

export default paymentReducer.reducer