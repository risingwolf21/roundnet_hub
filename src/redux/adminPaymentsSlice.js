import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { OPEN } from '../constants';

export const adminPaymentsSlice = createSlice({
    name: "admin-payments",
    initialState: {
        payments: [],
        loading: false,
        error: null
    },
    reducers: {

    },
    extraReducers(builder) {
        builder
            .addCase(fetchAdminsPaymentsAsync.pending, (state, action) => {
                state.loading = true;
            })
            .addCase(fetchAdminsPaymentsAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.error = '';

                state.payments = action.payload
            })
            .addCase(fetchAdminsPaymentsAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
    }
});

export const fetchAdminsPaymentsAsync = createAsyncThunk("admin-payments", async ({ client }) => {
    const response = await client.from("payments")
        .select("id, created_at, user (userId, displayName, email), history (*)")
        .eq("state", OPEN);
    return response.data;
});

export default adminPaymentsSlice.reducer;