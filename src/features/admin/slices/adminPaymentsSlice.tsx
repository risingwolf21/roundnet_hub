import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';
import {FullPayment, PaymentState} from '../../../types/supabaseTypes';
import {SupabaseClient} from '@supabase/supabase-js';

type AdminPaymentsSliceState = {
    payments: FullPayment[] | null,
    loading: boolean,
    error: string | undefined
}

const initialState = {
    payments: [],
    loading: false,
    error: undefined
} as AdminPaymentsSliceState;

export const adminPaymentsSlice = createSlice({
    name: "admin-payments",
    initialState,
    reducers: {},
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
                state.error = action.error.message?.toString();
            })
    }
});

export const fetchAdminsPaymentsAsync = createAsyncThunk("admin-payments", async ({ client }: { client: SupabaseClient }) => {
    const response = await client.from('payments')
        .select("id, created_at, paymentState, amountToPay, userId, user (userId, displayName, email), history (*)")
        .eq("paymentState", "Open" as PaymentState)
        .order("displayName", { foreignTable: "user", ascending: true })
        .returns<FullPayment[]>();
    return response.data;
});

export default adminPaymentsSlice.reducer;