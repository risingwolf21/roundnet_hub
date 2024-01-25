import { PayloadAction, Update, createAsyncThunk, createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import { IEventRepository } from "src/repository/IEventRepository";
import { Event, EventAttendance, EventAttendanceUpdate, FullAttendance, User } from "src/types/supabaseTypes";
import { formatDateToDatabase } from "src/utils";
import { fetchSingleEventAsync } from "./eventsSlice";
import { RootState } from "../store";

type SliceAttendance = {
    id: number,
    attendance: FullAttendance[]
}

const eventAttendanceAdapter = createEntityAdapter({
    selectId: (event: SliceAttendance) => event.id
})

export const attendanceSelector = eventAttendanceAdapter.getSelectors();

const eventAttendanceSlice = createSlice({
    name: 'eventAttendance',
    initialState: eventAttendanceAdapter.getInitialState({
        loading: false,
        error: ""
    }),
    reducers: {
        onEventAttendanceUpdate: (state, action: PayloadAction<EventAttendanceUpdate & { userId: string }>) => {
            let attendanceSlice = eventAttendanceAdapter.getSelectors().selectById(state, action.payload.event ?? -1);
            let index = attendanceSlice?.attendance.findIndex(x => x.user.userId === action.payload.user);
            if (!attendanceSlice || !action.payload.event || index === -1)
                return;

            eventAttendanceAdapter.upsertOne(state, {
                id: action.payload.event,
                attendance: attendanceSlice.attendance.map((x, i) =>
                    i === index ? {
                        ...x,
                        state: action.payload.state ?? x.state
                    } as FullAttendance : x
                )
            } as SliceAttendance);
        },
        onEventAttendanceDelete: (state, action: PayloadAction<number>) => {
            eventAttendanceAdapter.removeOne(state, action.payload)
        }
    },
    extraReducers(builder) {
        builder
            .addCase(fetchEventAttendanceAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.error = "";
                eventAttendanceAdapter.upsertOne(state, { id: action.payload.eventId, attendance: action.payload.data ?? [] })
            })
            .addCase(fetchEventAttendanceAsync.pending, (state, action) => {
                state.loading = true;
                state.error = "";
            })
            .addCase(fetchEventAttendanceAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error?.message ?? "";
            })

            .addCase(updateAttendanceAsync.pending, (state, action) => {
                state.loading = true
                let attendanceEntry = {
                    event: action.meta.arg.eventId,
                    user: action.meta.arg.user,
                    state: action.meta.arg.state,
                    userId: action.meta.arg.user.userId,
                    lastUpdate: formatDateToDatabase(new Date())
                } as FullAttendance;

                let attendance = eventAttendanceAdapter.getSelectors().selectById(state, action.meta.arg.eventId)?.attendance ?? []

                let index = attendance.findIndex(x => x.userId === action.meta.arg.user.userId);

                let sliceAttendance = {
                    id: action.meta.arg.eventId,
                    attendance: [...attendance
                        .map((x, i) => i === index ? {
                            ...x,
                            state: action.meta.arg.state,
                            lastUpdate: formatDateToDatabase(new Date())
                        } : attendanceEntry)]
                } as SliceAttendance;

                eventAttendanceAdapter.upsertOne(state, sliceAttendance);
            })
            .addCase(updateAttendanceAsync.rejected, (state, action) => {
                state.error = action.error.message ?? ""

                let index = (state.entities[action.meta.arg.eventId]?.attendance ?? [])
                    .findIndex(x => x.userId === action.meta.arg.user.userId);

                let sliceAttendance = {
                    id: action.meta.arg.eventId,
                    attendance: [...(state.entities[action.meta.arg.eventId]?.attendance ?? [])
                        .map((x, i) => i === index ? {
                            ...x,
                            state: action.meta.arg.state,
                            lastUpdate: formatDateToDatabase(new Date())
                        } : x)]
                } as SliceAttendance;

                eventAttendanceAdapter.upsertOne(state, sliceAttendance);
            })
            .addCase(updateAttendanceAsync.fulfilled, (state, action) => {
                state.loading = false;
            })
            .addCase(fetchSingleEventAsync.fulfilled, (state, action) => {
                if (!action.payload.data) {
                    return;
                }
                let attendanceUpdate = {
                    id: action.meta.arg.eventId,
                    changes: {
                        attendance: action.payload.data.attendance ?? []
                    }
                } as Update<SliceAttendance>;
                eventAttendanceAdapter.updateOne(state, attendanceUpdate);
            })
    },
});

type ClientEventId = { repository: IEventRepository, eventId: number }
export const fetchEventAttendanceAsync = createAsyncThunk("fetchEventAttendanceAsync", async ({ repository, eventId }: ClientEventId) => {
    const attendance = await repository.fetchEventAttendance(eventId);
    return { data: attendance.data, eventId };
});

type UpdateAttendanceProps = { user: User, eventId: number, state: EventAttendance, oldState: EventAttendance, repository: IEventRepository }
export const updateAttendanceAsync = createAsyncThunk("updateAttendanceAsync", async ({ repository, eventId, user, state, oldState }: UpdateAttendanceProps) => {
    const response = await repository.updateAttendance(user.userId, eventId, state);
    return { data: response.data, error: response.error, oldState };
});

export const { onEventAttendanceDelete, onEventAttendanceUpdate } = eventAttendanceSlice.actions;

export default eventAttendanceSlice.reducer;