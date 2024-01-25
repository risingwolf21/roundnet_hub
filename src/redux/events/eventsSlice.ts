import { PayloadAction, Update, createAsyncThunk, createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import { IEventRepository } from "src/repository/IEventRepository";
import { Event, EventAttendance, EventInsert, EventUpdate, FullAttendance, FullEvent, Group, User } from "src/types/supabaseTypes";
import { RootState } from "../store";
import { updateAttendanceAsync } from "./eventAttendanceSlice";

export type SliceEvent = Event & {
    userAttendance: EventAttendance,
    fullGroup: Group
}

const eventsAdapter = createEntityAdapter({
    selectId: (event: SliceEvent) => event.id,
    sortComparer: (a, b) => a.created_at.localeCompare(b.created_at),
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
            let event = action.payload as Event;
            let oldEvent = state.entities[event.id];
            if (!oldEvent)
                return;
            let newEvent = Object.assign(oldEvent, { ...event })
            eventsAdapter.upsertOne(state, newEvent)
        },
        onEventDelete: (state, action: PayloadAction<number>) => {
            eventsAdapter.removeOne(state, action.payload)
        },
        onEventInsert: (state, action: PayloadAction<EventInsert>) => {
            let newEvent = Object.assign({}, action.payload) as SliceEvent;
            eventsAdapter.addOne(state, newEvent)
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

                eventsAdapter.upsertOne(state, action.payload.data as FullEvent);
            })
            .addCase(fetchSingleEventAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message ?? "";
            })
            .addCase(updateAttendanceAsync.fulfilled, (state, action) => {
                let sliceEvent = {
                    id: action.meta.arg.eventId,
                    changes: {
                        userAttendance: action.meta.arg.state
                    }
                } as Update<SliceEvent>;

                eventsAdapter.updateOne(state, sliceEvent);
            })
    },
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

export const {
    selectEvent,
    editEvent,
    onEventErrorRead,
    onEventDelete,
    onEventUpdate } = eventsSlice.actions;

export default eventsSlice.reducer;