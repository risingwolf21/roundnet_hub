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
    attendanceError: null,
    endReached: false
  },
  reducers: {
    selectEvent: (state, action) => {
      state.selectedEvent = action.payload.id;
    },
    editEvent: (state, action) => {
      state.eventToEdit = action.payload;
    },
    onEventCommentInsert: (state, action) => {
      console.log(action.payload.new);
      let eventIndex = state.items.findIndex(x => x.id === action.payload.new.event);
      if (eventIndex !== -1) {
        state.items[eventIndex].comments = [...(state.items[eventIndex].comments ?? []), action.payload.new].sort((a, b) => new Date(a["created_at"]) - new Date(b["created_at"]))
      }
    },
    onEventCommentDelete: (state, action) => {
      let eventIndex = state.items.findIndex(x => x.comments.findIndex(y => y.id === action.payload.old.id) !== -1);
      if (eventIndex !== -1) {
        state.items[eventIndex.event].comments.filter(x => x.id !== action.payload.old.id)
      }
    },
    onEventCommentUpdate: (state, action) => {
      let eventIndex = state.items.findIndex(x => x.id === action.payload.new.event);
      if (eventIndex !== -1) {
        let commentIndex = state.items[eventIndex].comments.findIndex(x => x.id === action.payload.new.id);
        if (commentIndex !== -1) {
          state.items[eventIndex].comments[commentIndex] = action.payload.new;
        }
      }
    },
    onEventUpdate: (state, action) => {
      const index = state.items.findIndex((x) =>
        compareEventsFn(x, action.payload.new),
      )
      let event = state.items[index];
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
        let attendanceIndex = state.items[eventIndex].attendance.findIndex(x => x.userId === action.payload.new.userId);
        if (attendanceIndex !== -1) {
          state.items[eventIndex].attendance[attendanceIndex].state = action.payload.new.state;
        }
      }
    },
    onEventAttendanceUserDelete: (state, action) => {
      let eventIndex = state.items.findIndex(x => x.id === action.payload.old.event);
      if (eventIndex !== -1) {
        state.items[eventIndex].userAttendance = UNANSWERED;
        let attendanceIndex = state.items[eventIndex].attendance.findIndex(x => x.user.userId === action.payload.old.userId);
        if (attendanceIndex !== -1) {
          state.items[eventIndex].attendance[attendanceIndex].state = UNANSWERED;
        }
      }
    },
    onEventAttendanceUserInsert: (state, action) => {
      let eventIndex = state.items.findIndex(x => x.id === action.payload.new.event);
      if (eventIndex !== -1) {
        console.log(action.payload)
        state.items[eventIndex].userAttendance = action.payload.new.state;
        state.items[eventIndex].attendance = [...(state.items[eventIndex].userAttendance ?? []), action.payload.new];
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

        if (action.payload.entries && action.payload.entries.length < 1) {
          state.endReached = true
        } else {
          state.endReached = false
        }

        if (action.payload.more) {
          state.items = [...state.items, ...action.payload.entries];
        } else {
          state.items = action.payload.entries;
        }
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
        if (index !== -1) {
          state.items[index].attendance = action.payload.data;
        }
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

export const fetchEventsAsync = createAsyncThunk("events", async ({ client, user, page = 0, count = 20 }) => {
  const attendanceFromUser = await client.from("event_attendance_user_mapping").select("user(userId), event (id), state").eq("user.userId", user.id);

  const response = await client.from("events").select("*, attendance: event_attendance_user_mapping ( state , user(userId, displayName)  ), comments: event_comments ( comment, user ( displayName, userId))")
    // get events that are on the same day or later
    .gt("startingDateTime", moment().format("yyyy-MM-DD HH:mm:ssZ"))
    .range(page * count, page * count + count - 1)
    .order("startingDateTime", { ascending: true });
  return {
    entries: response.data.map(x => {
      return {
        ...x,
        userAttendance: attendanceFromUser.data?.find(y => y.event.id === x.id)?.state ?? UNANSWERED
      }
    }),
    more: page !== 0
  }
});

export const fetchEventAttendanceAsync = createAsyncThunk("fetchEventAttendanceAsync", async ({ client, eventId }) => {
  const attendance = await client.from("event_attendance_user_mapping").select("user(userId, displayName), event, state").eq("event", eventId);
  return { data: attendance.data, eventId };
});

export const {
  selectEvent,
  onEventDelete,
  onEventInsert,
  onEventUpdate,
  onEventAttendanceUserDelete,
  onEventAttendanceUserInsert,
  onEventAttendanceUserUpdate,
  editEvent,
  onEventCommentInsert,
  onEventCommentDelete,
  onEventCommentUpdate } = eventReducer.actions;

export default eventReducer.reducer