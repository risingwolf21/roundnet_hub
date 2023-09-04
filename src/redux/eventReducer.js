import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { UNANSWERED } from '../constants';
import moment from 'moment';

const compareEventsFn = (x, y) => {
  return x.id === y.id;
}

export const eventReducer = createSlice({
  name: 'events',
  initialState: {
    items: [],
    userAttendingEvents: [],
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
    },
    onEventUpdate: (state, action) => {
      const index = state.items.findIndex((x) =>
        compareEventsFn(x, action.payload.new),
      )
      state.items = [
        ...state.items.slice(0, index),
        action.payload.new,
        ...state.items.slice(index + 1)
      ]
    },
    onEventDelete: (state, action) => {
      state.items = state.items.filter(x => !compareEventsFn(x, action.payload.old))
    },
    onEventInsert: (state, action) => {
      state.items = [...(state.items ?? []), action.payload.new]
    },
    onEventAttendanceUserUpdate: (state, action) => {
      let eventIndex = state.items.findIndex(x => x.id === action.payload.new.event);
      if (eventIndex !== -1) {
        state.items[eventIndex].userAttendance = action.payload.new.state;
      }
    },
    onEventAttendanceUserDelete: (state, action) => {
      let eventIndex = state.items.findIndex(x => x.id === action.payload.old.event);

      if (eventIndex !== -1) {
        state.items[eventIndex].userAttendance = UNANSWERED;
      }

    },
    onEventAttendanceUserInsert: (state, action) => {
      let eventIndex = state.items.findIndex(x => x.id === action.payload.new.event);
      if (eventIndex !== -1) {
        state.items[eventIndex].userAttendance = action.payload.new.state;
      }
    },
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
  const response = await client.from("events").select("*, attendance: event_attendance_user_mapping ( state , user ( displayName, userId )  )")
    .gt("startingDateTime", moment().add(-1, "days").format("yyyy-MM-DD HH:mm:ssZ"));
  return response.data.map(x => {
    return {
      ...x,
      userAttendance: attendanceFromUser.data?.find(y => y.event.id === x.id)?.state ?? UNANSWERED
    }
  });
});

export const { selectEvent, onEventDelete, onEventInsert, onEventUpdate, onEventAttendanceUserDelete, onEventAttendanceUserInsert, onEventAttendanceUserUpdate } = eventReducer.actions;

export default eventReducer.reducer