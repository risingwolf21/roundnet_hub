import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { UNANSWERED } from '../constants';

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
      state.selectedEvent = {
        ...action.payload.event,
        currentUserAttendanceState: action.payload.event?.attendance?.find(x => x.user.userId === action.payload.userId)?.state ?? UNANSWERED
      }
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
        state.items = [];
      })
  }
});

export const fetchEventsAsync = createAsyncThunk("events", async ({ client, user }) => {
  const attendanceFromUser = await client.from("event_attendance_user_mapping").select("user(userId), event (id), state").eq("user.userId", user.id);
  const response = await client.from("events").select("*, attendance: event_attendance_user_mapping ( state , user ( displayName, userId )  )");
  return response.data.map(x => {
    return {
      ...x,
      userAttendance: attendanceFromUser.data?.find(y => y.event.id === x.id)?.state ?? UNANSWERED
    }
  });
});

export const { selectEvent } = eventReducer.actions;

export default eventReducer.reducer