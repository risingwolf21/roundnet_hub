import {createAsyncThunk, createEntityAdapter, createSlice, PayloadAction, Update} from "@reduxjs/toolkit";
import {EventAttendance, EventWithGroup, FullAttendance, FullEvent, Group, User} from "src/types/supabaseTypes";
import {RootState} from "../../../redux/store";
import {onEventAttendanceUpdate, updateAttendanceAsync} from "./eventAttendanceSlice";
import {SupabaseEventRepository} from "../../../repository/EventRepository";
import {Tables, TablesUpdate} from "../../../types/supabase-generated.types";
import {formatDateFromDatabase} from "../../../utils";

export type SliceEvent = Tables<'events'> & {
    userAttendance: EventAttendance,
    attendanceUpdating: boolean,
    fullGroup: Group
}

export const eventsAdapter = createEntityAdapter({
    selectId: (event: SliceEvent) => event.id
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
        recurringEventsLoading: false,
        recurringEvents: [] as EventWithGroup[]
    }),
    reducers: {
        selectEvent: (state, action: PayloadAction<number>) => {
            state.selectedEvent = action.payload;
        },
        editEvent: (state, action) => {
            state.eventToEdit = action.payload;
        },
        onEventUpdate: (state, action: PayloadAction<TablesUpdate<'events'>>) => {
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
            .addCase(fetchUpcomingEventsAsync.pending, (state, _action) => {
                state.loading = true;
            })
            .addCase(fetchUpcomingEventsAsync.fulfilled, (state, action) => {
                state.loading = false;

                state.endReached = action.payload.entries && action.payload.entries.length < 1;

                if (action.payload.more) {
                    eventsAdapter.addMany(state, action.payload.entries);
                } else {
                    eventsAdapter.setAll(state, action.payload.entries);
                }
            })
            .addCase(fetchUpcomingEventsAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message ?? "";
            })

            .addCase(fetchPastEventsAsync.pending, (state, _action) => {
                state.loading = true;
            })
            .addCase(fetchPastEventsAsync.fulfilled, (state, action) => {
                state.loading = false;

                state.endReached = action.payload.entries && action.payload.entries.length < 1;

                if (action.payload.more) {
                    eventsAdapter.addMany(state, action.payload.entries);
                } else {
                    eventsAdapter.setAll(state, action.payload.entries);
                }
            })
            .addCase(fetchPastEventsAsync.rejected, (state, action) => {
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

            .addCase(fetchRecurringEventsAsync.pending, (state, _action) => {
                state.recurringEventsLoading = true;
            })
            .addCase(fetchRecurringEventsAsync.fulfilled, (state, action) => {

                function getDayWithSundayAs7(date: Date) {
                    const day = date.getDay();
                    return day === 0 ? 7 : day;
                }

                state.recurringEventsLoading = false;
                state.recurringEvents = action.payload?.sort((a, b) =>
                        getDayWithSundayAs7(formatDateFromDatabase(a.startingDateTime)) - getDayWithSundayAs7(formatDateFromDatabase(b.startingDateTime))
                    )
                    ?? [];
            })
            .addCase(fetchRecurringEventsAsync.rejected, (state, action) => {
                state.recurringEventsLoading = false;
                state.error = action.error.message ?? "";
            })

            .addCase(updateAttendanceAsync.pending, (state, action) => {
                let sliceEvent = {
                    id: action.meta.arg.eventId,
                    changes: {attendanceUpdating: true}
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

export const fetchUpcomingEventsAsync = createAsyncThunk("fetchUpcomingEventsAsync", async ({
                                                                                                user,
                                                                                                page = 0,
                                                                                                count = 20
                                                                                            }: FetchEventsType) => {
    const response = await SupabaseEventRepository.fetchUpcomingEvents(page, count);
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

export const fetchPastEventsAsync = createAsyncThunk("fetchPastEventsAsync", async ({
                                                                                        user,
                                                                                        page = 0,
                                                                                        count = 20
                                                                                    }: FetchEventsType) => {
    const response = await SupabaseEventRepository.fetchPastEvents(page, count);
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

export type ClientEventId = { eventId: string }


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

export const fetchRecurringEventsAsync = createAsyncThunk("fetchRecurringEvents", async () => {
    const response = await SupabaseEventRepository.fetchRecurringEvents();
    return response.data;
});

export const {
    selectEvent,
    editEvent,
    onEventErrorRead,
    onEventDelete,
    onEventUpdate
} = eventsSlice.actions;

export default eventsSlice.reducer;