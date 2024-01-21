import { PayloadAction, createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import { Event, EventAttendance, EventInsert, EventUpdate, Group } from "src/types/supabaseTypes";

type SliceEvent = Event & {
    userAttendance: EventAttendance,
    fullGroup: Group
}

const eventsAdapter = createEntityAdapter({
    selectId: (event: SliceEvent) => event.id,
    sortComparer: (a, b) => a.created_at.localeCompare(b.created_at),
})

export const eventsSlice = createSlice({
    name: 'events',
    initialState: eventsAdapter.getInitialState({
        loading: false,
        error: ""
    }),
    reducers: {
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
    },
})