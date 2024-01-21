import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { toInteger } from "lodash";
import { Comment, EventAttendance, EventInsert, EventUpdate, FullAttendance, FullComment, FullEvent, User } from '../types/supabaseTypes';
import { IEventRepository } from '../repository/IEventRepository';

type EventSliceState = {
  items: FullEvent[],
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
    onEventUpdate: (state, action: PayloadAction<EventUpdate>) => {
      const index = state.items.findIndex(x => x.id === action.payload.id)
      if (index === -1)
        return;
      // eventsAdapter.updateOne(state, event)
      // state.items[index] = Object.assign(state.items[index], { ...event })
    },
    onEventDelete: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter(x => x.id !== action.payload)
    },
    onEventInsert: (state, action: PayloadAction<EventInsert>) => {
      // if (newEvent)
      //   state.items.push(newEvent)
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
  extraReducers(builder) {
    //@ts-ignore
    builder
      .addCase(fetchEventsAsync.pending, (state: EventSliceState, _action) => {
        state.loading = true;
      })
      .addCase(fetchEventsAsync.fulfilled, (state: EventSliceState, action) => {
        state.loading = false;

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

      .addCase(fetchSingleEventAsync.pending, (state: EventSliceState, _action) => {
        state.loading = true;
      })
      .addCase(fetchSingleEventAsync.fulfilled, (state: EventSliceState, action) => {
        state.loading = false;
        if (!action.payload.data) {
          state.error = "No event with ID [" + action.payload.eventId + "] found!";
          return;
        }
        state.error = null;
        let index = state.items.findIndex(x => x.id === toInteger(action.payload.eventId));
        if (index !== -1) {
          state.items[index] = action.payload.data as FullEvent;
        } else {
          state.items = [
            ...state.items.slice(0, index),
            action.payload.data as FullEvent,
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
        state.attendanceLoading = true;

        let index = state.items.findIndex(x => x.id === toInteger(action.meta.arg.eventId));

        if (index !== -1) {
          state.items[index].userAttendance = action.meta.arg.state;
        }
      })
      .addCase(updateAttendanceAsync.fulfilled, (state: EventSliceState, action) => {
        state.attendanceLoading = false;
      })
      .addCase(updateAttendanceAsync.rejected, (state: EventSliceState, action) => {
        state.attendanceLoading = false;

        let index = state.items.findIndex(x => x.id === toInteger(action.meta.arg.eventId));

        if (index !== -1) {
          state.items[index].userAttendance = action.meta.arg.state;
        }
      })
  }
});


export const fetchUserGroupsAsync = createAsyncThunk("fetchUserGroupsAsync", async ({ repository, user }: { repository: IEventRepository, user: User }) => {
  const response = await repository.fetchUserGroups(user);
  return (response.data ?? []).map(x => x.group);
});

type FetchEventsType = {
  user: User,
  page: number,
  count: number,
  repository: IEventRepository
}

export const fetchEventsAsync = createAsyncThunk("events", async ({ user, page = 0, count = 20, repository }: FetchEventsType) => {
  const userGroups = await repository.fetchUserGroups(user);
  const response = await repository.fetchEvents(user, userGroups.data?.map(x => x.group.id) ?? [], page, count);
  return {
    entries: (response.data ?? []).map((x: FullEvent) => {
      return {
        ...x,
        userAttendance: (x.attendance.find((y: FullAttendance) => y.user.userId === user.userId)?.state ?? "Unanswered") as EventAttendance
      }
    }),
    more: page !== 0
  };
});

export type ClientEventId = { repository: IEventRepository, eventId: number }


export const fetchSingleEventAsync = createAsyncThunk("fetchSingleEventAsync", async ({ repository, eventId, userId }: ClientEventId & { userId: string }) => {
  const response = await repository.fetchSingleEvent(eventId);
  return {
    data: {
      ...response.data,
      userAttendance: response.data?.attendance.find((x: FullAttendance) => x.user.userId === userId)?.state ?? "Unanswered"
    }, eventId
  };
});

type UpdateAttendanceProps = {
  user: User,
  eventId: number,
  state: EventAttendance,
  oldState: EventAttendance,
  repository: IEventRepository
}

export const updateAttendanceAsync = createAsyncThunk("updateAttendanceAsync", async ({ repository, eventId, user, state, oldState }: UpdateAttendanceProps) => {
  const response = await repository.updateAttendance(user.userId, eventId, state);
  return { data: response.data, error: response.error, oldState };
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