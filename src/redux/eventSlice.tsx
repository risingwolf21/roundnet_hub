import { createSlice, createAsyncThunk, PayloadAction, ActionReducerMapBuilder } from '@reduxjs/toolkit';
import moment from 'moment';
import _, { toInteger } from "lodash";
import { compareById, formatDateToDatabase } from '../utils';
import { Comment, EventAttendance, FullAttendance, FullComment, FullEvent, Group, User } from '../types/supabaseTypes';
import { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { ClientUser } from '../types/types';

type EventSliceState = {
  items: FullEvent[] extends infer O ? O : never,
  userGroups: number[],
  selectedEvent: number | null,
  eventToEdit: FullEvent | null,
  error: string | null,
  loading: boolean,
  attendanceLoading: boolean,
  attendanceError: string | null,
  endReached: boolean
}

const initialState = {
  items: [],
  userGroups: [],
  selectedEvent: null,
  eventToEdit: null,
  error: null,
  loading: false,
  attendanceLoading: false,
  attendanceError: null,
  endReached: false
} as EventSliceState;

export const eventSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    selectEvent: (state, action: PayloadAction<number>) => {
      state.selectedEvent = action.payload;
    },
    editEvent: (state, action) => {
      state.eventToEdit = action.payload;
    },
    onEventCommentInsert: (state, action: PayloadAction<Comment>) => {
      let eventIndex = state.items.findIndex(x => x.id === action.payload.id);
      if (eventIndex !== -1) {
        state.items[eventIndex].comments = [...(state.items[eventIndex].comments ?? []),
        { ...action.payload as Comment, userId: action.payload.user, user: null } as FullComment]
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      }
    },
    onEventCommentDelete: (state, action) => {
      let eventIndex = state.items.findIndex(x => x.comments.findIndex(y => y.id === action.payload.old.id) !== -1);
      if (eventIndex !== -1) {
        state.items[eventIndex].comments = state.items[eventIndex].comments.filter(x => x.id !== action.payload.old.id)
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
      const index = state.items.findIndex((x) => compareById(x, action.payload))
      let event = state.items[index];
      state.items = [
        ...state.items.slice(0, index),
        Object.assign(event, action.payload.new),
        ...state.items.slice(index + 1)
      ]
    },
    onEventDelete: (state, action) => {
      state.items = state.items.filter(x => !compareById(x, action.payload.old))
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
        state.items[eventIndex].userAttendance = "Unanswered";
        let attendanceIndex = state.items[eventIndex].attendance.findIndex(x => x.user.userId === action.payload.old.userId);
        if (attendanceIndex !== -1) {
          state.items[eventIndex].attendance[attendanceIndex].state = "Unanswered";
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
    onEventErrorRead: (state, _action) => {
      state.error = null;
    }
  },
  extraReducers(builder: ActionReducerMapBuilder<EventSliceState>) {
    //@ts-ignore
    builder
      .addCase(fetchEventsAsync.pending, (state: EventSliceState, action) => {
        state.loading = true;
      })
      .addCase(fetchEventsAsync.fulfilled, (state: EventSliceState, action) => {
        state.loading = false;
        state.error = null;

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
      .addCase(fetchEventsAsync.rejected, (state: EventSliceState, action) => {
        state.loading = false;
        state.error = action.error.message ?? "";
        state.items = [];
      })

      .addCase(fetchEventAttendanceAsync.pending, (state: EventSliceState, _action) => {
        state.attendanceLoading = true;
      })
      .addCase(fetchEventAttendanceAsync.fulfilled, (state: EventSliceState, action) => {
        state.attendanceLoading = false;
        state.attendanceError = '';
        let index = state.items.findIndex(x => x.id === action.payload.eventId);
        if (index !== -1) {
          state.items[index].attendance = action.payload.data ?? [];
        }
      })
      .addCase(fetchEventAttendanceAsync.rejected, (state: EventSliceState, action) => {
        state.attendanceLoading = false;
        state.attendanceError = action.error.message ?? "";
      })

      .addCase(fetchSingleEventAsync.pending, (state: EventSliceState, _action) => {
        state.loading = true;
      })
      .addCase(fetchSingleEventAsync.fulfilled, (state: EventSliceState, action) => {
        state.loading = false;
        state.error = null;
        let index = state.items.findIndex(x => x.id === toInteger(action.payload.eventId));
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
      .addCase(fetchSingleEventAsync.rejected, (state: EventSliceState, action) => {
        state.loading = false;
        state.error = action.error.message ?? "";
      })

      .addCase(fetchUserGroupsAsync.fulfilled, (state: EventSliceState, action) => {
        state.userGroups = action.payload.map(x => x.id);
      })

      .addCase(updateAttendanceAsync.pending, (state: EventSliceState, action) => {
        let attendanceEntry = {
          event: toInteger(action.meta.arg.eventId),
          user: { displayName: action.meta.arg.user.displayName, userId: action.meta.arg.user.userId },
          state: action.meta.arg.state,
          userId: "",
          created_at: formatDateToDatabase(moment())
        } as FullAttendance;
        let index = state.items.findIndex(x => x.id === toInteger(action.meta.arg.eventId));

        if (index !== -1) {
          state.items[index].userAttendance = action.meta.arg.state;

          let attendanceIndex = state.items[index].attendance.findIndex(x => x.user.userId === action.meta.arg.user.userId);
          if (attendanceIndex !== -1) {
            state.items[index].attendance[attendanceIndex] = attendanceEntry
          } else {
            state.items[index].attendance = [...state.items[index].attendance, attendanceEntry]
          }
        }
      })
      .addCase(updateAttendanceAsync.fulfilled, (state: EventSliceState, action) => {
        updateAttendanceRevert(state, "rejected", toInteger(action.meta.arg.eventId), action.meta.arg.user.displayName ?? "Anon",
          action.meta.arg.user.userId, action.meta.arg.state)
      })
      .addCase(updateAttendanceAsync.rejected, (state: EventSliceState, action) => {
        updateAttendanceRevert(state, "rejected", toInteger(action.meta.arg.eventId), action.meta.arg.user.displayName ?? "Anon",
          action.meta.arg.user.userId, action.meta.arg.state)
      })

      .addCase(upsertCommentToEventAsync.pending, (state: EventSliceState, action) => {
        let newComment = {
          id: -1,
          pending: true,
          comment: action.meta.arg.comment ?? "",
          event: toInteger(action.meta.arg.eventId),
          displayName: action.meta.arg.user.displayName ?? "",
          user: { userId: action.meta.arg.user.userId, displayName: action.meta.arg.user.displayName ?? "", email: null },
          userId: action.meta.arg.user.userId,
          created_at: formatDateToDatabase(moment())
        } as FullComment;
        let eventIndex = state.items.findIndex(x => x.id === toInteger(action.meta.arg.eventId));

        if (eventIndex !== -1) {
          // event exists user, eventId, comment
          let commentIndex = state.items[eventIndex].comments.findIndex(x =>
            x.user?.userId === action.meta.arg.user.userId && x.comment === action.meta.arg.comment && x.event === toInteger(action.meta.arg.eventId));
          if (commentIndex !== -1) {
            // update comment
            state.items[eventIndex].comments[commentIndex] = newComment;
          } else {
            // insert new comment
            state.items[eventIndex].comments = [...(state.items[eventIndex].comments ?? []), newComment]
              .sort((a, b) => new Date(a["created_at"]).getTime() - new Date(b["created_at"]).getTime())
          }
        }
      })
      .addCase(upsertCommentToEventAsync.fulfilled, (state, action) => {
        upsertCommentRevertFulFilled(state, action.meta.arg.eventId, action.meta.arg.user.userId, action.meta.arg.comment,
          action.payload.error?.message ?? null);
      })
      .addCase(upsertCommentToEventAsync.rejected, (state, action) => {
        upsertCommentRevertFulFilled(state, action.meta.arg.eventId, action.meta.arg.user.userId, action.meta.arg.comment,
          "rejected");
      })
  }
});

const upsertCommentRevertFulFilled = (state: EventSliceState, eventId: number, userId: string,
  comment: string, error: string | null) => {
  let eventIndex = state.items.findIndex(x => x.id === eventId);
  if (eventIndex === -1)
    return;

  let commentIndex = state.items[eventIndex].comments.findIndex(x =>
    x.user?.userId === userId && x.comment === comment
    && x.event === eventId);

  if (commentIndex === -1)
    return;

  if (!error) {
    state.items[eventIndex].comments[commentIndex] = Object.assign(state.items[eventIndex].comments[commentIndex], { pending: false });
  } else {
    state.error = error;
    state.items[eventIndex].comments = state.items[eventIndex].comments.filter((_x, index) => index === commentIndex);
  }
}

const updateAttendanceRevert = (state: EventSliceState, error: string | null, eventId: number, displayName: string, userId: string,
  oldAttendance: EventAttendance) => {
  // Reset to oldState because there was an error updating
  if (error) {
    state.error = error;
    let attendanceEntry = {
      event: eventId,
      user: { displayName: displayName, userId: userId },
      userId: userId,
      state: oldAttendance,
      created_at: formatDateToDatabase(moment())
    } as FullAttendance;
    let index = state.items.findIndex(x => x.id === eventId);

    if (index !== -1) {
      state.items[index].userAttendance = oldAttendance;

      let attendanceIndex = state.items[index].attendance.findIndex(x => x.user.userId === userId);
      if (attendanceIndex !== -1) {
        state.items[index].attendance[attendanceIndex] = attendanceEntry
      } else {
        state.items[index].attendance = [...state.items[index].attendance, attendanceEntry]
      }
    }
  }
}

export const fetchUserGroupsAsync = createAsyncThunk("fetchUserGroupsAsync", async ({ client, user }: ClientUser) => {
  const response = await client.from("group_user_mapping")
    .select("user(userId), group(*)")
    .eq("user.userId", user.userId)
    .returns<{ user: { userId: string }, group: Group }[]>();
  return (response.data ?? []).map(x => x.group);
});

type FetchEventsType = ClientUser & {
  userGroups: Group[],
  page: number,
  count: number
}

export const fetchEventsAsync = createAsyncThunk("events", async ({ client, user, userGroups = [], page = 0, count = 20 }: FetchEventsType) => {
  const response = await client.from("events").select("*, attendance: event_attendance_user_mapping ( state , user(userId, displayName)  ), comments: event_comments ( comment, created_at, displayName, event, user ( displayName, userId)), groups: event_group(*)")
    // get events that are on the same day or later
    .gt("startingDateTime", moment().format("yyyy-MM-DD HH:mm:ssZ"))
    .range(page * count, page * count + count - 1)
    .order("startingDateTime", { ascending: true })
    .returns<FullEvent[]>();
  return {
    entries: (response.data ?? []).filter(x => _.intersection(x.groups.map(y => y.id), userGroups.map(y => y.id)).length > 0).map<FullEvent>((x: FullEvent) => {
      return {
        ...x,
        userAttendance: x.attendance.find(y => y.user.userId === user.userId)?.state ?? "Unanswered"
      }
    }),
    more: page !== 0
  };
});

type ClientEventId = { client: SupabaseClient, eventId: number }

export const fetchEventAttendanceAsync = createAsyncThunk("fetchEventAttendanceAsync", async ({ client, eventId }: ClientEventId) => {
  const attendance = await client.from("event_attendance_user_mapping")
    .select("user(userId, displayName), event, state")
    .eq("event", eventId)
    .returns<FullAttendance[]>()
  return { data: attendance.data, eventId };
});

export const fetchSingleEventAsync = createAsyncThunk("fetchSingleEventAsync", async ({ client, eventId }: ClientEventId) => {
  const response = await client.from("events").select("*, attendance: event_attendance_user_mapping ( state , user(userId, displayName)  ), comments: event_comments ( comment, created_at, displayName, event, user ( displayName, userId))")
    .eq("id", eventId).limit(1);
  if (response.data?.length === 1) {
    return {
      data: {
        ...response.data[0],
        place: JSON.parse(response.data[0].place)
      }, eventId
    }
  }
  return { data: response.data, eventId };
});

type UpdateAttendanceProps = ClientUser & {
  eventId: string,
  state: EventAttendance,
  oldState: EventAttendance
}

export const updateAttendanceAsync = createAsyncThunk("updateAttendanceAsync", async ({ client, eventId, user, state, oldState }: UpdateAttendanceProps) => {
  const response = await client.from("event_attendance_user_mapping").upsert({
    user: user.userId,
    event: eventId,
    state: state
  }).select().single();
  return { data: response.data, error: response.error, oldState };
});

type UpsertCommentProps = { client: SupabaseClient, user: User, eventId: number, comment: string }
type DataErrorReturned = { data: any | null, error: PostgrestError | null }
export const upsertCommentToEventAsync = createAsyncThunk("upsertCommentToEventAsync", async ({ client, user, eventId, comment }: UpsertCommentProps) => {
  const response = await client.from("event_comments").insert({
    user: user.userId,
    event: eventId,
    comment: comment,
    displayName: user?.displayName ?? "Anon"
  }).select("*").single<Comment>();

  return { data: response.data, error: response.error } as DataErrorReturned;
});

export const {
  onEventErrorRead,
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
  onEventCommentUpdate } = eventSlice.actions;

export default eventSlice.reducer