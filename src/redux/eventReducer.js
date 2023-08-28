import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const compareDrinkFn = (x, y) => {
  return x.id === y.id;
}

export const eventReducer = createSlice({
  name: 'events',
  initialState: {
    items: [],
    selectedEvent: null,
    error: null,
    loading: false
  },
  reducers: {
    selectEvent: (state, action) => {
      state.selectedEvent = action.payload
    }
  },
  extraReducers(builder) {
    builder
      .addCase(fetchEventsAsync.pending, (state, action) => {
        state.loading = true;
      })
      .addCase(fetchEventsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.error = '';
        state.items = action.payload
      })
      .addCase(fetchEventsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
  }
});

export const fetchEventsAsync = createAsyncThunk("events", async (client) => {
  const response = await client.from("events").select("*, attendance: event_attendance_user_mapping ( state , user ( displayName, userId )  )")
  return response.data;
});

export const { selectEvent } = eventReducer.actions;

export default eventReducer.reducer