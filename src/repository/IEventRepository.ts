import { EventAttendance, EventAttendanceMapping, EventInsert, FullAttendance, FullEvent, Group, User } from "../types/supabaseTypes";
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import moment from "moment";
import { PostgrestError } from '@supabase/supabase-js'
import { injectable } from "inversify";
import { SupabaseRepository } from "./Repository";
import { Json } from "src/types/supabase";

export type DbResult<T> = T extends PromiseLike<infer U> ? U : never
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? Exclude<U, null> : never
export type DbResultErr = PostgrestError

export type RepositorySource = "supabase" | "none";

interface IEventRepository {
    insertEvent(event: EventInsert): Promise<PostgrestSingleResponse<null>>
    updateEndOfOldEvent(eventId: number, end_at: string): Promise<PostgrestSingleResponse<null>>
    fetchEvents(user: User, userGroups: number[], page: number, count: number): Promise<PostgrestSingleResponse<FullEvent[]>>
    updateCancellationForEvent(eventId: number, isCancelled: boolean): Promise<PostgrestSingleResponse<null>>
    deleteEvent(eventId: number): Promise<PostgrestSingleResponse<null>>
    deleteEventAndUpcomingEvents(eventId: number, key: string, startDateTime: string | null): Promise<void>
    updateAttendance(userId: string, eventId: number, state: EventAttendance): Promise<PostgrestSingleResponse<EventAttendanceMapping>>
    insertComment(user: User, eventId: number, comment: string): Promise<PostgrestSingleResponse<Comment>>
    fetchEventAttendance(eventId: number): Promise<PostgrestSingleResponse<FullAttendance[]>>
    fetchSingleEvent(eventId: number): Promise<PostgrestSingleResponse<FullEvent>>
    fetchUserGroups(user: User): Promise<PostgrestSingleResponse<{ user: { userId: string }, group: Group }[]>>
}

@injectable()
class SupabaseEventRepository extends SupabaseRepository implements IEventRepository {

    async updateEndOfOldEvent(eventId: number, end_at: string): Promise<PostgrestSingleResponse<null>> {
        return this.client
            .from("events")
            .update({
                "end_at": end_at
            }).eq("id", eventId)
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
                displayName: user.displayName
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
                end_at: moment().format("yyyy-MM-DD HH:mm:ssZ")
            })
            .eq("id", eventId);
    }

    async updateCancellationForEvent(eventId: number, isCancelled: boolean): Promise<PostgrestSingleResponse<null>> {
        return this.client
            .from("events")
            .update({ isCancelled: isCancelled })
            .eq("id", eventId)
    }

    async fetchEvents(user: User, userGroups: number[], page: number, count: number): Promise<PostgrestSingleResponse<FullEvent[]>> {
        const query = await this.client.from("events")
            .select("*, attendance: event_attendance_user_mapping ( state , user(userId, displayName)  ), comments: event_comments ( comment, created_at, displayName, event, user ( displayName, userId))")
            // get events that are on the same day or later
            .gt("startingDateTime", moment().format("yyyy-MM-DD HH:mm:ssZ"))
            .in("group", userGroups)
            .range(page * count, page * count + count - 1)
            .order("startingDateTime", { ascending: true })
            .returns<FullEvent[]>();

        return query;
    }

    async fetchUserGroups(user: User): Promise<PostgrestSingleResponse<{ user: { userId: string }, group: Group }[]>> {
        return this.client.from("group_user_mapping")
            .select("user(userId), group(*)")
            .eq("user.userId", user.userId)
            .returns<{ user: { userId: string }, group: Group }[]>();
    }

    async fetchEventAttendance(eventId: number): Promise<PostgrestSingleResponse<FullAttendance[]>> {
        return this.client.from("event_attendance_user_mapping")
            .select("user(userId, displayName), event, state")
            .eq("event", eventId)
            .returns<FullAttendance[]>();
    }

    async fetchSingleEvent(eventId: number): Promise<PostgrestSingleResponse<FullEvent>> {
        return this.client.from("events")
            .select("*, attendance: event_attendance_user_mapping ( state , user(userId, displayName)  ), comments: event_comments ( comment, created_at, displayName, event, user ( displayName, userId))")
            .eq("id", eventId)
            .single<FullEvent>()
    }

}

export { SupabaseEventRepository, IEventRepository }