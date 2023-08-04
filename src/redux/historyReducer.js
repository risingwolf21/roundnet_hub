import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const compareHistoryFn = (x, y) => {
    return x.id === y.id;
}

export const historyReducer = createSlice({
    name: 'history',
    initialState: {
        items: [],
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
        },
    },
    extraReducers(builder) {
        builder
            .addCase(fetchHistoryAsync.pending, (state, action) => {
                state.loading = true;
            })
            .addCase(fetchHistoryAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.error = '';

                state.items = action.payload
            })
            .addCase(fetchHistoryAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
    }
});

export const fetchHistoryAsync = createAsyncThunk("history", async ({ client, user }) => {
    const response = await client.from("history").select("count, amount, created_at, drinkId: drink").eq('user', user.id);
    console.log(response.data)
    return response.data;
});

export const { onHistoryUpdate, onHistoryDelete, onHistoryInsert } = historyReducer.actions;

export default historyReducer.reducer