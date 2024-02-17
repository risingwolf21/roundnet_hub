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
import {PostgrestError, PostgrestSingleResponse} from '@supabase/supabase-js';
import moment from "moment";
import {injectable} from "inversify";
import {SupabaseRepository} from "./Repository";
import {formatDateToDatabase} from "src/utils";
import {add, Duration} from "date-fns";
import _ from "lodash";

export type DbResult<T> = T extends PromiseLike<infer U> ? U : never
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? Exclude<U, null> : never
export type DbResultErr = PostgrestError

export type RepositorySource = "supabase" | "none";

interface IEventRepository {
    insertEvent(event: EventInsert): Promise<PostgrestSingleResponse<null>>

    updateEndOfOldEvent(eventId: number, recurrenceEnd: string): Promise<PostgrestSingleResponse<null>>

    updateEvent(eventId: number, event: EventUpdate): Promise<PostgrestSingleResponse<null>>

    updateEventAndAllRecurrences(eventUpdate: EventUpdate): Promise<PostgrestSingleResponse<null>>

    fetchEvents(user: User, userGroups: number[], page: number, count: number): Promise<PostgrestSingleResponse<FullEvent[]>>

    updateCancellationForEvent(eventId: number, isCancelled: boolean): Promise<PostgrestSingleResponse<null>>

    deleteEvent(eventId: number): Promise<PostgrestSingleResponse<null>>

    deleteEventAndUpcomingEvents(eventId: number, key: string, startDateTime: string | null): Promise<void>

    updateAttendance(userId: string, eventId: number, state: EventAttendance): Promise<PostgrestSingleResponse<EventAttendanceMapping>>

    insertComment(user: User, eventId: number, comment: string): Promise<PostgrestSingleResponse<Comment>>

    fetchEventAttendance(eventId: number): Promise<PostgrestSingleResponse<FullAttendance[]>>

    fetchEventComments(eventId: number): Promise<PostgrestSingleResponse<FullComment[]>>

    fetchSingleEvent(eventId: number): Promise<PostgrestSingleResponse<FullEvent>>

    fetchUserGroups(user: User): Promise<PostgrestSingleResponse<{ user: { userId: string }, group: Group }[]>>
}

@injectable()
class SupabaseEventRepository extends SupabaseRepository implements IEventRepository {
    async updateEventAndAllRecurrences(eventUpdate: EventUpdate): Promise<PostgrestSingleResponse<null>> {

        const {
            data,
            error
        } = await this.client.from("events").select("*").eq("key", eventUpdate.key).gte("id", eventUpdate.id).order("id").returns<Event[]>();

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

        return this.client
            .from("events")
            .upsert(events);
    }


    async fetchEventComments(eventId: number): Promise<PostgrestSingleResponse<FullComment[]>> {
        return this.client.from("event_comments")
            .select("user(userId, displayName, avatarUrl), *")
            .eq("event", eventId)
            .returns<FullComment[]>();
    }

    async updateEndOfOldEvent(eventId: number, recurrenceEnd: string): Promise<PostgrestSingleResponse<null>> {
        return this.client
            .from("events")
            .update({
                recurrenceEnd: recurrenceEnd
            }).eq("id", eventId)
    }

    async updateEvent(eventId: number, event: EventUpdate): Promise<PostgrestSingleResponse<null>> {
        return this.client
            .from("events")
            .update(event)
            .eq("id", eventId)
    }

    async insertEvent(event: EventInsert): Promise<PostgrestSingleResponse<null>> {
        return this.client.from("events").insert(event);
    }

    async insertComment(user: User, eventId: number, comment: string): Promise<PostgrestSingleResponse<Comment>> {
        return this.client.from("event_comments")
            .insert({
                user: user.userId,
                event: eventId,
                comment: comment,
                displayName: user.displayName ?? ""
            })
            .select()
            .single<Comment>();
    }

    async updateAttendance(userId: string, eventId: number, state: "Declined" | "Attending" | "Unanswered"): Promise<PostgrestSingleResponse<EventAttendanceMapping>> {
        return this.client.rpc("update_attendance", {
            eventid: eventId,
            userid: userId,
            state
        }).returns<EventAttendanceMapping>()
    }

    async deleteEvent(eventId: number): Promise<PostgrestSingleResponse<null>> {
        return this.client
            .from("events")
            .delete()
            .eq("id", eventId)
    }

    async deleteEventAndUpcomingEvents(eventId: number, key: string, startDateTime: string | null): Promise<void> {
        await this.client
            .from("events")
            .delete()
            .eq("key", key)
            .gt("startingDateTime", startDateTime);

        await this.client
            .from("events")
            .update({
                recurrenceEnd: moment().format("yyyy-MM-DD HH:mm:ssZ")
            })
            .eq("id", eventId);
    }

    async updateCancellationForEvent(eventId: number, isCancelled: boolean): Promise<PostgrestSingleResponse<null>> {
        return this.client
            .from("events")
            .update({isCancelled: isCancelled})
            .eq("id", eventId)
    }

    async fetchEvents(user: User, userGroups: number[], page: number, count: number): Promise<PostgrestSingleResponse<FullEvent[]>> {
        return this.client.from("events")
            .select("*, fullGroup: event_group(id, created_at, description, name, color), attendance: event_attendance_user_mapping ( state , user(userId, displayName, avatarUrl)  ), comments: event_comments ( comment, created_at, displayName, event, user ( displayName, userId, avatarUrl))")
            // get events that are on the same day or later
            .gt("startingDateTime", formatDateToDatabase(new Date()))
            .or(`recurrenceEnd.is.null,recurrenceEnd.gt.'${formatDateToDatabase(new Date())}'`)
            .lt("startingDateTime", formatDateToDatabase(add(new Date(), {weeks: 2})))
            .in("group", userGroups)
            .range(page * count, page * count + count - 1)
            .order("startingDateTime", {ascending: true})
            .returns<FullEvent[]>();
    }

    async fetchUserGroups(user: User): Promise<PostgrestSingleResponse<{ user: { userId: string }, group: Group }[]>> {
        return this.client.from("group_user_mapping")
            .select("user(userId), group(*)")
            .eq("user.userId", user.userId)
            .not("user", "is", null)
            .returns<{ user: { userId: string }, group: Group }[]>();
    }

    async fetchEventAttendance(eventId: number): Promise<PostgrestSingleResponse<FullAttendance[]>> {
        return this.client.from("event_attendance_user_mapping")
            .select("user(userId, displayName, avatarUrl), *")
            .eq("event", eventId)
            .returns<FullAttendance[]>();
    }

    async fetchSingleEvent(eventId: number): Promise<PostgrestSingleResponse<FullEvent>> {
        return this.client.from("events")
            .select("*, group(*), attendance: event_attendance_user_mapping ( state , user(userId, displayName, avatarUrl)  ), comments: event_comments ( comment, created_at, displayName, event, user ( displayName, userId, avatarUrl))")
            .eq("id", eventId)
            .single<FullEvent>()
    }

}

export {SupabaseEventRepository, IEventRepository}