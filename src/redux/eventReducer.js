import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { UNANSWERED } from '../constants';
import moment from 'moment';
import _ from "lodash";

const compareEventsFn = (x, y) => {
  return x.id === y.id;
}

export const eventReducer = createSlice({
  name: 'events',
  initialState: {
    items: [],
    userGroups: [],
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

        console.log(action.payload)

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

      .addCase(fetchSingleEventAsync.pending, (state, action) => {
        state.loading = true;
      })
      .addCase(fetchSingleEventAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.error = '';

        console.log(action.payload.data)

        let index = state.items.findIndex(x => x.id === action.payload.eventId);
        if (index !== -1) {
          state.items[index] = Object.assign(state.items[index], action.payload.data);
        } else {
          state.items = [
            ...state.items.slice(0, index),
            action.payload.data,
            ...state.items.slice(index + 1)
          ]
        }
      })
      .addCase(fetchSingleEventAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(fetchUserGroupsAsync.fulfilled, (state, action) => {
        state.userGroups = action.payload;
      })
  }
});

export const fetchUserGroupsAsync = createAsyncThunk("fetchUserGroupsAsync", async ({ client, user }) => {
  const response = await client.from("group_user_mapping").select("user(userId), group(*)").eq("user.userId", user.id);
  return response.data.map(x => x.group);
});

export const fetchEventsAsync = createAsyncThunk("events", async ({ client, user, userGroups = [], page = 0, count = 20 }) => {
  const response = await client.from("events").select("*, attendance: event_attendance_user_mapping ( state , user(userId, displayName)  ), comments: event_comments ( comment, displayName, user ( displayName, userId)), groups: event_group(*)")
    // get events that are on the same day or later
    .gt("startingDateTime", moment().format("yyyy-MM-DD HH:mm:ssZ"))
    .range(page * count, page * count + count - 1)
    .order("startingDateTime", { ascending: true });
  return {
    entries: response.data.filter(x => _.intersection(x.groups.map(y => y.id), userGroups.map(y => y.id)).length > 0).map(x => {
      return {
        ...x,
        place: JSON.parse(x.place),
        groups: x.groups.map(x => x.group),
        userAttendance: x.attendance.find(y => y.user.userId === user.id)?.state ?? UNANSWERED
      }
    }),
    more: page !== 0
  }
});

export const fetchEventAttendanceAsync = createAsyncThunk("fetchEventAttendanceAsync", async ({ client, eventId }) => {
  const attendance = await client.from("event_attendance_user_mapping").select("user(userId, displayName), event, state").eq("event", eventId);
  return { data: attendance.data, eventId };
});

export const fetchSingleEventAsync = createAsyncThunk("fetchSingleEventAsync", async ({ client, eventId }) => {
  const response = await client.from("events").select("*, attendance: event_attendance_user_mapping ( state , user(userId, displayName)  ), comments: event_comments ( comment, displayName, user ( displayName, userId))")
    .eq("id", eventId).limit(1);
  if (response.data.length === 1) {
    return {
      data: {
        ...response.data[0],
        place: JSON.parse(response.data[0].place)
      }, eventId
    }
  }
  return { data: response.data, eventId };
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