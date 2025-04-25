import { createAsyncThunk, createEntityAdapter, createSlice, PayloadAction, Update } from '@reduxjs/toolkit';
import { EventWithGroup } from 'src/types/supabaseTypes';
import { RootState } from '../../../redux/store';
import { SupabaseEventRepository } from '../../../repository/EventRepository';
import { TablesUpdate } from '../../../types/supabase-generated.types';
import { formatDateFromDatabase } from '../../../utils';
import { onEventAttendanceUpdate, updateAttendanceAsync } from './eventAttendanceSlice';

export type SliceEvent = FullEvent & {
  userAttendance: EventAttendance;
  attendanceUpdating: boolean;
};

const eventsAdapter = createEntityAdapter({
  selectId: (event: SliceEvent) => event.id,
});
export const eventsSelector = eventsAdapter.getSelectors((st: RootState) => st.events);

const eventsSlice = createSlice({
  name: 'events',
  initialState: eventsAdapter.getInitialState({
    loading: false,
    error: null as string | null,
    selectedEvent: null as number | null,
    eventToEdit: null as FullEvent | null,
    fetchMode: "upcoming" as "upcoming" | "past",
    recurringEventsLoading: false,
    recurringEvents: [] as EventWithGroup[],
  }),
  reducers: {
    selectEvent: (state, action: PayloadAction<number>) => {
      state.selectedEvent = action.payload;
    },
    editEvent: (state, action) => {
      state.eventToEdit = action.payload;
    },
    updateFetchMode: (state, action: PayloadAction<"upcoming" | "past">) => {
      state.fetchMode = action.payload
    },
    onEventsUpdate: (state, action: PayloadAction<TablesUpdate<'events'>[]>) => {
      action.payload.forEach(element => {
        onEventUpdate(element)
      });
    },
    onEventUpdate: (state, action: PayloadAction<TablesUpdate<'events'>>) => {
      let eventSlice = eventsAdapter.getSelectors().selectById(state, action.payload.id ?? -1);
      if (!eventSlice) return;

      let update = action.payload;

      let changes = {
        id: eventSlice.id,
        changes: {
          answerDeadline: update.answerDeadline,
          created_at: update.created_at,
          description: update.description,
          recurrenceEnd: update.recurrenceEnd,
          group: update.group,
          isCancelled: update.isCancelled,
          key: update.key,
          maxAttendees: update.maxAttendees,
          meetingDateTime: update.meetingDateTime,
          place: update.place,
          recurrence: update.recurrence,
          startingDateTime: update.startingDateTime,
          title: update.title,
        },
      } as Update<SliceEvent>;

      eventsAdapter.updateOne(state, changes);
    },
    onEventDelete: (state, action: PayloadAction<number>) => {
      eventsAdapter.removeOne(state, action.payload);
    },
    onEventErrorRead: (state, _action) => {
      state.error = null;
    },
  },
  extraReducers(builder) {
    builder

      .addCase(fetchEventsAsync.pending, (state, _action) => {
        state.loading = true;
      })
      .addCase(fetchEventsAsync.fulfilled, (state, action) => {
        state.loading = false;

        eventsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchEventsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? '';
      })

      .addCase(fetchSingleEventAsync.pending, (state, _action) => {
        state.loading = true;
      })
      .addCase(fetchSingleEventAsync.fulfilled, (state, action) => {
        state.loading = false;
        if (!action.payload) {
          state.error = 'No event with ID [' + action.meta.arg.eventId + '] found!';
          return;
        }
        state.error = null;

        eventsAdapter.upsertOne(state, action.payload as SliceEvent);
      })
      .addCase(fetchSingleEventAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? '';
      })

      .addCase(fetchRecurringEventsAsync.pending, (state, _action) => {
        state.recurringEventsLoading = true;
      })
      .addCase(fetchRecurringEventsAsync.fulfilled, (state, action) => {
        function getDayWithSundayAs7(date: Date) {
          const day = date.getDay();
          return day === 0 ? 7 : day;
        }

        state.recurringEventsLoading = false;
        state.recurringEvents =
          action.payload?.sort(
            (a, b) =>
              getDayWithSundayAs7(formatDateFromDatabase(a.startingDateTime)) -
              getDayWithSundayAs7(formatDateFromDatabase(b.startingDateTime))
          ) ?? [];
      })
      .addCase(fetchRecurringEventsAsync.rejected, (state, action) => {
        state.recurringEventsLoading = false;
        state.error = action.error.message ?? '';
      })

      .addCase(updateAttendanceAsync.pending, (state, action) => {
        let sliceEvent = {
          id: action.meta.arg.event.id,
          changes: { attendanceUpdating: true },
        } as Update<SliceEvent>;

        eventsAdapter.updateOne(state, sliceEvent);
      })
      .addCase(updateAttendanceAsync.fulfilled, (state, action) => {
        let sliceEvent = {
          id: action.meta.arg.event.id,
          changes: {
            userAttendance: action.meta.arg.state,
            attendanceUpdating: false,
          },
        } as Update<SliceEvent>;

        eventsAdapter.updateOne(state, sliceEvent);
      })
      .addCase(onEventAttendanceUpdate, (state, action) => {
        if (!action.payload.event || action.payload.user !== action.payload.userId) return;

        let sliceEvent = {
          id: action.payload.event,
          changes: {
            userAttendance: action.payload.state,
          },
        } as Update<SliceEvent>;

        eventsAdapter.updateOne(state, sliceEvent);
      });
  },
});

type FetchEventsType = {
  user: User;
  fetchMode: 'upcoming' | 'past'
};

export const fetchEventsAsync = createAsyncThunk(
  'fetchEventsAsync',
  async ({ user, fetchMode }: FetchEventsType) => {
    const response = await SupabaseEventRepository.fetchEvents(fetchMode);
    return (response.data ?? []).map((x: FullEvent) => ({
      ...x,
      userAttendance: x.attendance.find((y) => y.user.userId === user.userId)?.state ?? 'Unanswered',
      attendanceUpdating: false,
    }));
  }
);

type ClientEventId = { eventId: string };

export const fetchSingleEventAsync = createAsyncThunk(
  'fetchSingleEventAsync',
  async ({
    eventId,
    userId,
  }: ClientEventId & {
    userId: string;
  }) => {
    const response = await SupabaseEventRepository.fetchSingleEvent(eventId);
    if (!response.data) return null;
    return {
      ...response.data,
      userAttendance: response.data?.attendance.find((x) => x.user.userId === userId)?.state ?? 'Unanswered',
      attendanceUpdating: false,
    };
  }
);

export const fetchRecurringEventsAsync = createAsyncThunk('fetchRecurringEvents', async () => {
  const response = await SupabaseEventRepository.fetchRecurringEvents();
  return response.data;
});

export const {  editEvent, onEventErrorRead,  onEventUpdate, onEventsUpdate, updateFetchMode } = eventsSlice.actions;

export default eventsSlice.reducer;
