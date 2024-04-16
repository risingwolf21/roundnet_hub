import {
    Comment,
    Event,
    EventAttendance,
    EventAttendanceMapping,
    EventInsert,
    EventRecurrence,
    EventUpdate,
    FullAttendance,
    FullComment,
    FullEvent,
    Group,
    User
} from "../types/supabaseTypes";
import {PostgrestError, PostgrestSingleResponse} from "@supabase/supabase-js";
import {add, Duration} from "date-fns";
import _ from "lodash";
import {formatDateToDatabase} from "../utils";
import moment from "moment/moment";
import {supabase} from "../components/services/supabase/supabaseClient";

export const SupabaseEventRepository = {
    async updateEventAndAllRecurrences(eventUpdate: EventUpdate): Promise<PostgrestSingleResponse<null>> {

        const {
            data,
            error
        } = await supabase.from("events").select("*").eq("key", eventUpdate.key ?? '').gte("id", eventUpdate.id).order("id").returns<Event[]>();

        if (!data || error) {
            return {
                error: {
                    code: "",
                    details: "",
                    hint: "",
                    message: "Could not fetch events that need to be updated!"
                } as PostgrestError, data: null, count: null, status: 400, statusText: ""
            };
        }

        const recurrenceFrom = (recurrence: EventRecurrence, index: number): Duration => {
            switch (recurrence) {
                case "Monthly":
                    return {months: index};
                case "Weekly":
                    return {days: index * 7};
                case "Fortnightly":
                    return {days: index * 14};
                case "None":
                    return {days: 0}
            }
        }

        const events = data.map((e, index) => {
            return {
                ...e,
                ...(_.omit(eventUpdate, ["id"])),
                startingDateTime: eventUpdate.startingDateTime ? formatDateToDatabase(add(eventUpdate.startingDateTime, recurrenceFrom(eventUpdate.recurrence ?? e.recurrence, index))) : e.startingDateTime,
                endDateTime: eventUpdate.endDateTime ? formatDateToDatabase(add(eventUpdate.endDateTime, recurrenceFrom(eventUpdate.recurrence ?? e.recurrence, index))) : e.endDateTime,
                meetingDateTime: eventUpdate.meetingDateTime ? formatDateToDatabase(add(eventUpdate.meetingDateTime, recurrenceFrom(eventUpdate.recurrence ?? e.recurrence, index))) : e.meetingDateTime,
                answerDeadline: eventUpdate.answerDeadline ? formatDateToDatabase(add(eventUpdate.answerDeadline, recurrenceFrom(eventUpdate.recurrence ?? e.recurrence, index))) : e.answerDeadline,
            } as EventInsert;
        });

        return supabase
            .from("events")
            .upsert(events)
            .throwOnError();
    },


    async fetchEventComments(eventId: number): Promise<PostgrestSingleResponse<FullComment[]>> {
        return supabase.from("event_comments")
            .select("user(userId, displayName, avatarUrl), *")
            .eq("event", eventId)
            .returns<FullComment[]>()
            .throwOnError()
    },

    async updateEndOfOldEvent(eventId: number, recurrenceEnd: string): Promise<PostgrestSingleResponse<null>> {
        return supabase
            .from("events")
            .update({
                recurrenceEnd: recurrenceEnd
            }).eq("id", eventId)
            .throwOnError()
    },

    async updateEvent(eventId: number, event: EventUpdate): Promise<PostgrestSingleResponse<null>> {
        return supabase
            .from("events")
            .update(event)
            .eq("id", eventId)
            .throwOnError()
    },

    async insertEvent(event: EventInsert): Promise<PostgrestSingleResponse<null>> {
        return supabase.from("events").insert(event).throwOnError();
    },

    async insertComment(user: User, eventId: number, comment: string): Promise<PostgrestSingleResponse<Comment>> {
        return supabase.from("event_comments")
            .insert({
                user: user.userId,
                event: eventId,
                comment: comment,
                displayName: user.displayName ?? ""
            })
            .select()
            .single<Comment>()
            .throwOnError();
    },

    async updateAttendance(userId: string, eventId: number, state: EventAttendance): Promise<PostgrestSingleResponse<EventAttendanceMapping>> {
        return supabase
            .rpc("update_attendance", {
                eventid: eventId,
                userid: userId,
                state
            })
            .returns<EventAttendanceMapping>()
            .throwOnError();
    },

    async deleteEvent(eventId: number): Promise<PostgrestSingleResponse<null>> {
        return supabase
            .from("events")
            .delete()
            .eq("id", eventId)
            .throwOnError()
    },

    async deleteEventAndUpcomingEvents(eventId: number, key: string, startDateTime: string | null): Promise<void> {
        await supabase
            .from("events")
            .delete()
            .eq("key", key)
            .gt("startingDateTime", startDateTime);

        await supabase
            .from("events")
            .update({
                recurrenceEnd: moment().format("yyyy-MM-DD HH:mm:ssZ")
            })
            .eq("id", eventId);
    },

    async updateCancellationForEvent(eventId: number, isCancelled: boolean): Promise<PostgrestSingleResponse<null>> {
        return supabase
            .from("events")
            .update({isCancelled: isCancelled})
            .eq("id", eventId)
            .throwOnError()
    },

    async fetchEvents(user: User, userGroups: number[], page: number, count: number): Promise<PostgrestSingleResponse<FullEvent[]>> {
        return supabase.from("events")
            .select("*, fullGroup: event_group(id, created_at, description, name, color), attendance: event_attendance_user_mapping ( state , user(userId, displayName, avatarUrl)  ), comments: event_comments ( comment, created_at, displayName, event, user ( displayName, userId, avatarUrl))")
            // get events that are on the same day or later
            .gt("startingDateTime", formatDateToDatabase(new Date()))
            .or(`recurrenceEnd.is.null,recurrenceEnd.gt.'${formatDateToDatabase(new Date())}'`)
            .lt("startingDateTime", formatDateToDatabase(add(new Date(), {weeks: 2})))
            .in("group", userGroups)
            .range(page * count, page * count + count - 1)
            .order("startingDateTime", {ascending: true})
            .returns<FullEvent[]>()
            .throwOnError();
    },

    async fetchUserGroups(user: User): Promise<PostgrestSingleResponse<{ user: { userId: string }, group: Group }[]>> {
        return supabase.from("group_user_mapping")
            .select("user(userId), group(*)")
            .eq("user.userId", user.userId)
            .not("user", "is", null)
            .returns<{ user: { userId: string }, group: Group }[]>()
            .throwOnError();
    },

    async fetchEventAttendance(eventId: number): Promise<PostgrestSingleResponse<FullAttendance[]>> {
        return supabase.from("event_attendance_user_mapping")
            .select("user(userId, displayName, avatarUrl), *")
            .eq("event", eventId)
            .returns<FullAttendance[]>()
            .throwOnError();
    },

    async fetchSingleEvent(eventId: number): Promise<PostgrestSingleResponse<FullEvent>> {
        return supabase.from("events")
            .select("*, group(*), attendance: event_attendance_user_mapping ( state , user(userId, displayName, avatarUrl)  ), comments: event_comments ( comment, created_at, displayName, event, user ( displayName, userId, avatarUrl))")
            .eq("id", eventId)
            .single<FullEvent>()
            .throwOnError();
    }
}