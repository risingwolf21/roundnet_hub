import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const compareDrinkFn = (x, y) => {
  return x.id === y.id;
}

export const eventReducer = createSlice({
  name: 'events',
  initialState: {
    items: [],
    error: null,
    loading: false
  },
  extraReducers(builder) {
    builder
      .addCase(fetchEventsAsync.pending, (state, action) => {
        state.loading = true;
      })
      .addCase(fetchEventsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.error = '';
        console.log(action.payload)
        state.items = action.payload
      })
      .addCase(fetchEventsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
  }
});

export const fetchEventsAsync = createAsyncThunk("events", async (client) => {
  const response = await client.from("events").select("*")
  return response.data;
});

export default eventReducer.reducer