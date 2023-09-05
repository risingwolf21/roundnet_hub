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
    selectedEvent: null,
    eventToEdit: null,
    error: null,
    loading: false,
    attendanceLoading: false,
    attendanceError: null
  },
  reducers: {
    selectEvent: (state, action) => {
      state.selectedEvent = {
        ...action.payload.event,
        currentUserAttendanceState: action.payload.event?.attendance?.find(x => x.user.userId === action.payload.userId)?.state ?? UNANSWERED
      }
    },
    editEvent: (state, action) => {
      state.eventToEdit = action.payload;
    },
    onEventUpdate: (state, action) => {
      const index = state.items.findIndex((x) =>
        compareEventsFn(x, action.payload.new),
      )
      let event = state.items[index];
      state.selectedEvent = Object.assign(state.selectedEvent, action.payload.new);
      state.items = [
        ...state.items.slice(0, index),
        Object.assign(event, action.payload.new),
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

      .addCase(fetchEventAttendanceAsync.pending, (state, action) => {
        state.attendanceLoading = true;
      })
      .addCase(fetchEventAttendanceAsync.fulfilled, (state, action) => {
        state.attendanceLoading = false;
        state.attendanceError = '';

        let index = state.items.findIndex(x => x.id === action.payload.eventId);
        if (index !== -1)
          state.items[index].attendance = action.payload.data;
      })
      .addCase(fetchEventAttendanceAsync.rejected, (state, action) => {
        state.attendanceLoading = false;
        state.attendanceError = action.error.message;
        let index = state.items.findIndex(x => x.id === action.payload.eventId);
        if (index !== -1)
          state.items[index].attendance = [];
      })
  }
});

export const fetchEventsAsync = createAsyncThunk("events", async ({ client, user }) => {
  const attendanceFromUser = await client.from("event_attendance_user_mapping").select("user(userId), event (id), state").eq("user.userId", user.id);

  const response = await client.from("events").select("*, attendance: event_attendance_user_mapping ( state , user ( displayName, userId )  )")
    // get events that are on the same day or later
    .gt("startingDateTime", moment().format("yyyy-MM-DD HH:mm:ssZ")).order("startingDateTime", { ascending: true });
  return response.data.map(x => {
    return {
      ...x,
      userAttendance: attendanceFromUser.data?.find(y => y.event.id === x.id)?.state ?? UNANSWERED
    }
  });
});

export const fetchEventAttendanceAsync = createAsyncThunk("fetchEventAttendanceAsync", async ({ client, eventId }) => {
  const attendance = await client.from("event_attendance_user_mapping").select("user(userId), event (id), state").eq("event.id", eventId);

  return { data: attendance.data, eventId };
});

export const { selectEvent, onEventDelete, onEventInsert, onEventUpdate, onEventAttendanceUserDelete, onEventAttendanceUserInsert, onEventAttendanceUserUpdate, editEvent } = eventReducer.actions;

export default eventReducer.reducer