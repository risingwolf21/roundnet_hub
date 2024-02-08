import {
    Comment,
    Event,
    EventAttendance,
    EventAttendanceMapping,
    EventInsert,
    EventUpdate,
    FullAttendance,
    FullComment,
    FullEvent,
    Group,
    User
} from "../types/supabaseTypes";
import {PostgrestSingleResponse, PostgrestError} from '@supabase/supabase-js';
import moment from "moment";
import {injectable} from "inversify";
import {SupabaseRepository} from "./Repository";
import {formatDateToDatabase} from "src/utils";
import {add, interval, intervalToDuration} from "date-fns";
import _ from "lodash";

export type DbResult<T> = T extends PromiseLike<infer U> ? U : never
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? Exclude<U, null> : never
export type DbResultErr = PostgrestError

export type RepositorySource = "supabase" | "none";

interface IEventRepository {
    insertEvent(event: EventInsert): Promise<PostgrestSingleResponse<null>>

    updateEndOfOldEvent(eventId: number, recurrenceEnd: string): Promise<PostgrestSingleResponse<null>>

    updateEvent(eventId: number, event: EventUpdate): Promise<PostgrestSingleResponse<null>>

    updateEventAndAllRecurrences(event: FullEvent, eventUpdate: EventUpdate): Promise<PostgrestSingleResponse<null>>

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
    async updateEventAndAllRecurrences(event: FullEvent, eventUpdate: EventUpdate): Promise<PostgrestSingleResponse<null>> {
        let startingDateTimeDifference = eventUpdate.startingDateTime ? intervalToDuration({
            start: event.startingDateTime,
            end: eventUpdate.startingDateTime
        }) : intervalToDuration(interval(0, 0));

        let endDateTimeDifference = intervalToDuration(interval(new Date(), new Date()));
        if (event.endDateTime && eventUpdate.endDateTime) {
            endDateTimeDifference = intervalToDuration(interval(event.endDateTime, eventUpdate.endDateTime));
        }

        let meetingDateTimeDifference = intervalToDuration(interval(0, 0));
        if (event.meetingDateTime && eventUpdate.meetingDateTime) {
            meetingDateTimeDifference = intervalToDuration(interval(event.meetingDateTime, eventUpdate.meetingDateTime));
        }

        let answerDeadlineDifference = intervalToDuration(interval(0, 0));
        if (event.answerDeadline && eventUpdate.answerDeadline) {
            answerDeadlineDifference = intervalToDuration(interval(event.answerDeadline, eventUpdate.answerDeadline));
        }

        const {
            data,
            error
        } = await this.client.from("events").select("*").eq("key", event.key).gte("id", event.id).returns<Event[]>();

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

        console.log(meetingDateTimeDifference)
        console.log(endDateTimeDifference)

        const events = data.map((e) => {
            return {
                ...(_.omit(event, ["id", "fullGroup", "attendance", "comments", "userAttendance", "attendanceUpdating"])),
                ...(_.omit(eventUpdate, ["id"])),
                startingDateTime: formatDateToDatabase(add(e.startingDateTime, startingDateTimeDifference)),
                endDateTime: e.endDateTime
                    ? formatDateToDatabase(add(e.endDateTime, endDateTimeDifference))
                    : eventUpdate.endDateTime
                        ? add(eventUpdate.endDateTime, {})
                        : null,
                meetingDateTime: e.meetingDateTime ? formatDateToDatabase(add(e.meetingDateTime, meetingDateTimeDifference)) : null,
                answerDeadline: e.answerDeadline
                    ? formatDateToDatabase(add(e.answerDeadline, answerDeadlineDifference))
                    : eventUpdate.answerDeadline
                        ? add(eventUpdate.answerDeadline, {})
                        : null
            } as EventInsert;
        });
        console.log(events);

        return {
            error: {
                code: "",
                details: "",
                hint: "",
                message: "Could not fetch events that need to be updated!"
            } as PostgrestError, data: null, count: null, status: 400, statusText: ""
        };
        // return this.client
        //     .from("events")
        //     .upsert(events);
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
        return this.client.from("event_attendance_user_mapping")
            .upsert({
                user: userId,
                event: eventId,
                state: state
            })
            .select()
            .single<EventAttendanceMapping>();
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