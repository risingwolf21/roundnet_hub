import { createAsyncThunk, createEntityAdapter, createSlice, PayloadAction, Update } from '@reduxjs/toolkit';
import { FullAttendance, UserWithRolesAndPermissions } from 'src/types/supabaseTypes';
import { formatDateToDatabase } from 'src/utils';
import { fetchSingleEventAsync } from './eventsSlice';
import { SupabaseEventRepository } from '../../../repository/EventRepository';
import { TablesUpdate } from '../../../types/supabase-generated.types';
import { Event } from 'types/supabase';
import { GoogleRepository } from 'src/repository/GoogleRepository';

type SliceAttendance = {
  id: string;
  attendance: FullAttendance[];
};

const eventAttendanceAdapter = createEntityAdapter({
  selectId: (event: SliceAttendance) => event.id,
});

export const attendanceSelector = eventAttendanceAdapter.getSelectors();

const eventAttendanceSlice = createSlice({
  name: 'eventAttendance',
  initialState: eventAttendanceAdapter.getInitialState({
    loading: false,
    error: '',
  }),
  reducers: {
    onEventAttendanceUpdate: (
      state,
      action: PayloadAction<
        TablesUpdate<'event_attendance_user_mapping'> & {
          userId: string;
        }
      >
    ) => {
      let attendanceSlice = eventAttendanceAdapter.getSelectors().selectById(state, action.payload.event ?? -1);
      let index = attendanceSlice?.attendance.findIndex((x) => x.user.userId === action.payload.user);
      if (!attendanceSlice || !action.payload.event || index === -1) return;

      eventAttendanceAdapter.upsertOne(state, {
        id: action.payload.event,
        attendance: attendanceSlice.attendance.map((x, i) =>
          i === index
            ? ({
              ...x,
              state: action.payload.state ?? x.state,
            } as FullAttendance)
            : x
        ),
      } as SliceAttendance);
    },
    onEventAttendanceDelete: (state, action: PayloadAction<number>) => {
      eventAttendanceAdapter.removeOne(state, action.payload);
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchEventAttendanceAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.error = '';

        let slice = eventAttendanceAdapter.getSelectors().selectById(state, action.payload.eventId);

        if (!slice) {
          eventAttendanceAdapter.addOne(state, {
            id: action.payload.eventId,
            attendance:
              action.payload.data?.map((x) => {
                return {
                  ...x,
                  userId: x.user.userId,
                };
              }) ?? [],
          });
          return;
        }

        let update = {
          id: action.payload.eventId,
          changes: {
            attendance:
              action.payload.data?.map((x) => {
                return {
                  ...x,
                  userId: x.user.userId,
                };
              }) ?? [],
          },
        } as Update<SliceAttendance>;

        eventAttendanceAdapter.updateOne(state, update);
      })
      .addCase(fetchEventAttendanceAsync.pending, (state, action) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchEventAttendanceAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message ?? '';
      })

      .addCase(updateAttendanceAsync.pending, (state, action) => {
        state.loading = true;
        let attendanceEntry = {
          event: action.meta.arg.event.id,
          user: action.meta.arg.user.userId,
          state: action.meta.arg.state,
          lastUpdate: formatDateToDatabase(new Date()),
        } as FullAttendance;

        let slice = eventAttendanceAdapter.getSelectors().selectById(state, action.meta.arg.event.id);
        if (!slice) {
          eventAttendanceAdapter.addOne(state, { id: action.meta.arg.event.id, attendance: [attendanceEntry] });
          return;
        }

        let attendance = slice.attendance;

        let sliceAttendance = {
          id: action.meta.arg.event.id,
        } as Update<SliceAttendance>;

        let index = attendance.findIndex((x) => x.user.userId === action.meta.arg.user.userId);

        if (index === -1) {
          sliceAttendance.changes = { attendance: [...attendance, attendanceEntry] };
        } else {
          sliceAttendance.changes = {
            attendance: attendance.map((x, i) =>
              i === index
                ? {
                  ...x,
                  state: action.meta.arg.state,
                  lastUpdate: formatDateToDatabase(new Date()),
                }
                : x
            ),
          };
        }

        eventAttendanceAdapter.updateOne(state, sliceAttendance);
      })
      .addCase(updateAttendanceAsync.rejected, (state, action) => {
        state.error = action.error.message ?? '';

        let attendance =
          eventAttendanceAdapter.getSelectors().selectById(state, action.meta.arg.event.id)?.attendance ?? [];
        let index = attendance.findIndex((x) => x.user.userId === action.meta.arg.user.userId);

        if (!attendance || index < 0) return;

        let sliceAttendance = {
          id: action.meta.arg.event.id,
          changes: {
            attendance: attendance.map((x, i) =>
              i === index
                ? {
                  ...x,
                  state: action.meta.arg.oldState,
                  lastUpdate: formatDateToDatabase(new Date()),
                }
                : x
            ),
          },
        } as Update<SliceAttendance>;

        eventAttendanceAdapter.updateOne(state, sliceAttendance);
      })
      .addCase(updateAttendanceAsync.fulfilled, (state, action) => {
        state.loading = false;
      })
      .addCase(fetchSingleEventAsync.fulfilled, (state, action) => {
        if (!action.payload) {
          return;
        }
        let attendanceUpdate = {
          id: action.meta.arg.eventId,
          changes: {
            attendance: action.payload.attendance ?? [],
          },
        } as Update<SliceAttendance>;
        eventAttendanceAdapter.updateOne(state, attendanceUpdate);
      });
  },
});

type ClientEventId = { eventId: string };
export const fetchEventAttendanceAsync = createAsyncThunk(
  'fetchEventAttendanceAsync',
  async ({ eventId }: ClientEventId) => {
    const attendance = await SupabaseEventRepository.fetchEventAttendance(eventId);
    return { data: attendance.data, eventId };
  }
);

type UpdateAttendanceProps = { user: UserWithRolesAndPermissions; event: Event; state: EventAttendance; oldState: EventAttendance, provider_token?: string | null };
export const updateAttendanceAsync = createAsyncThunk(
  'updateAttendanceAsync',
  async ({ event, user, state, oldState, provider_token }: UpdateAttendanceProps) => {

    if (provider_token && (state === "Attending" || state === "AttendingAsTrainer")) {
      await GoogleRepository.insertEventToCalendar(event, user.userId, provider_token, user.calendar_data);
    } else if (provider_token && state === "Declined") {
      await GoogleRepository.deleteEventFromGoogleCalendar(event, user.userId, provider_token, user.calendar_data);
    }

    const response = await SupabaseEventRepository.updateAttendance(user.userId, event.id, state);
    return { data: response.data, error: response.error, oldState };
  }
);

export const {  onEventAttendanceUpdate } = eventAttendanceSlice.actions;

export default eventAttendanceSlice.reducer;
