import {createAsyncThunk, createEntityAdapter, createSlice, PayloadAction, Update} from "@reduxjs/toolkit";
import {Event, EventAttendance, EventUpdate, FullAttendance, FullEvent, Group, User} from "src/types/supabaseTypes";
import {RootState} from "../store";
import {onEventAttendanceUpdate, updateAttendanceAsync} from "./eventAttendanceSlice";
import {SupabaseEventRepository} from "../../repository/EventRepository";

export type SliceEvent = Event & {
    userAttendance: EventAttendance,
    attendanceUpdating: boolean,
    fullGroup: Group
}

const eventsAdapter = createEntityAdapter({
    selectId: (event: SliceEvent) => event.id,
    sortComparer: (a, b) => a.startingDateTime.localeCompare(b.startingDateTime),
});
export const eventsSelector = eventsAdapter.getSelectors((st: RootState) => st.events);

const eventsSlice = createSlice({
    name: 'events',
    initialState: eventsAdapter.getInitialState({
        loading: false,
        error: null as string | null,
        endReached: false,
        selectedEvent: null as number | null,
        eventToEdit: null as FullEvent | null,
    }),
    reducers: {
        selectEvent: (state, action: PayloadAction<number>) => {
            state.selectedEvent = action.payload;
        },
        editEvent: (state, action) => {
            state.eventToEdit = action.payload;
        },
        onEventUpdate: (state, action: PayloadAction<EventUpdate>) => {
            let eventSlice = eventsAdapter.getSelectors().selectById(state, action.payload.id ?? -1);
            if (!eventSlice)
                return;


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
                    title: update.title
                }
            } as Update<SliceEvent>;

            eventsAdapter.updateOne(state, changes);
        },
        onEventDelete: (state, action: PayloadAction<number>) => {
            eventsAdapter.removeOne(state, action.payload)
        },
        onEventErrorRead: (state, _action) => {
            state.error = null;
        }
    },
    extraReducers(builder) {
        builder
            .addCase(fetchEventsAsync.pending, (state, _action) => {
                state.loading = true;
            })
            .addCase(fetchEventsAsync.fulfilled, (state, action) => {
                state.loading = false;

                state.endReached = action.payload.entries && action.payload.entries.length < 1;

                if (action.payload.more) {
                    eventsAdapter.addMany(state, action.payload.entries);
                } else {
                    eventsAdapter.setAll(state, action.payload.entries);
                }
            })
            .addCase(fetchEventsAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message ?? "";
            })

            .addCase(fetchSingleEventAsync.pending, (state, _action) => {
                state.loading = true;
            })
            .addCase(fetchSingleEventAsync.fulfilled, (state, action) => {
                state.loading = false;
                if (!action.payload.data) {
                    state.error = "No event with ID [" + action.payload.eventId + "] found!";
                    return;
                }
                state.error = null;

                eventsAdapter.upsertOne(state, action.payload.data as SliceEvent);
            })
            .addCase(fetchSingleEventAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message ?? "";
            })
            .addCase(updateAttendanceAsync.pending, (state, action) => {
                let sliceEvent = {
                    id: action.meta.arg.eventId,
                    changes: { attendanceUpdating: true }
                } as Update<SliceEvent>;

                eventsAdapter.updateOne(state, sliceEvent);
            })
            .addCase(updateAttendanceAsync.fulfilled, (state, action) => {
                let sliceEvent = {
                    id: action.meta.arg.eventId,
                    changes: {
                        userAttendance: action.meta.arg.state,
                        attendanceUpdating: false,
                    }
                } as Update<SliceEvent>;

                eventsAdapter.updateOne(state, sliceEvent);
            })
            .addCase(onEventAttendanceUpdate, (state, action) => {
                console.log(action)
                if (!action.payload.event || action.payload.user !== action.payload.userId)
                    return;

                let sliceEvent = {
                    id: action.payload.event,
                    changes: {
                        userAttendance: action.payload.state,
                    }
                } as Update<SliceEvent>;

                eventsAdapter.updateOne(state, sliceEvent);
            })
    },
});

type FetchEventsType = {
    user: User,
    page: number,
    count: number
}

export const fetchEventsAsync = createAsyncThunk("events", async ({user, page = 0, count = 20}: FetchEventsType) => {
    const userGroups = await SupabaseEventRepository.fetchUserGroups(user);
    const response = await SupabaseEventRepository.fetchEvents(user, userGroups.data?.map(x => x.group.id) ?? [], page, count);
    return {
        entries: (response.data ?? []).map((x: FullEvent) => {
            return {
                ...x,
                userAttendance: (x.attendance.find((y: FullAttendance) => y.user.userId === user.userId)?.state ?? "Unanswered") as EventAttendance,
                attendanceUpdating: false
            }
        }),
        more: page !== 0
    };
});

export type ClientEventId = { eventId: number }


export const fetchSingleEventAsync = createAsyncThunk("fetchSingleEventAsync", async ({
                                                                                          eventId,
                                                                                          userId
                                                                                      }: ClientEventId & {
    userId: string
}) => {
    const response = await SupabaseEventRepository.fetchSingleEvent(eventId);
    return {
        data: {
            ...response.data,
            userAttendance: response.data?.attendance.find((x: FullAttendance) => x.user.userId === userId)?.state ?? "Unanswered",
            attendanceUpdating: false
        }, eventId
    };
});

export const {
    selectEvent,
    editEvent,
    onEventErrorRead,
    onEventDelete,
    onEventUpdate } = eventsSlice.actions;

export default eventsSlice.reducer;