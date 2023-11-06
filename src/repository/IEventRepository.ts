import { EventAttendance, EventAttendanceMapping, FullAttendance, FullEvent, Group, User } from "../types/supabaseTypes";
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import moment from "moment";
import { PostgrestError } from '@supabase/supabase-js'
import { injectable } from "inversify";
import { SupabaseRepository } from "./Repository";

export type DbResult<T> = T extends PromiseLike<infer U> ? U : never
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? Exclude<U, null> : never
export type DbResultErr = PostgrestError

export type RepositorySource = "supabase" | "none";

interface IEventRepository {
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
        const query = await this.client.from("events").select("*, attendance: event_attendance_user_mapping ( state , user(userId, displayName)  ), comments: event_comments ( comment, created_at, displayName, event, user ( displayName, userId)), groups: event_group(*)")
            // get events that are on the same day or later
            .gt("startingDateTime", moment().format("yyyy-MM-DD HH:mm:ssZ"))
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

@injectable()
class EmptyEventRepository implements IEventRepository {
    fetchUserGroups(user: { created_at: string | null; displayName: string | null; email: string | null; role: "user" | "admin" | "procure" | "finance" | "trainer"; userId: string; verified: boolean; }): Promise<PostgrestSingleResponse<{ user: { userId: string; }; group: { color: string; created_at: string | null; description: string | null; id: number; name: string | null; }; }[]>> {
        throw new Error("Method not implemented.");
    }
    fetchSingleEvent(eventId: number): Promise<PostgrestSingleResponse<FullEvent>> {
        throw new Error("Method not implemented.");
    }
    fetchEvents(user: { created_at: string | null; displayName: string | null; email: string | null; role: "user" | "admin" | "procure" | "finance" | "trainer"; userId: string; verified: boolean; }, userGroups: number[], page: number, count: number): Promise<PostgrestSingleResponse<FullEvent[]>> {
        throw new Error("Method not implemented.");
    }
    updateCancellationForEvent(eventId: number, isCancelled: boolean): Promise<PostgrestSingleResponse<null>> {
        throw new Error("Method not implemented.");
    }
    deleteEvent(eventId: number): Promise<PostgrestSingleResponse<null>> {
        throw new Error("Method not implemented.");
    }
    deleteEventAndUpcomingEvents(eventId: number, key: string, startDateTime: string | null): Promise<void> {
        throw new Error("Method not implemented.");
    }
    updateAttendance(userId: string, eventId: number, state: "Declined" | "Attending" | "Unanswered"): Promise<PostgrestSingleResponse<{ created_at: string | null; event: number; state: "Declined" | "Attending" | "Unanswered"; user: string; }>> {
        throw new Error("Method not implemented.");
    }
    insertComment(user: { created_at: string | null; displayName: string | null; email: string | null; role: "user" | "admin" | "procure" | "finance" | "trainer"; userId: string; verified: boolean; }, eventId: number, comment: string): Promise<PostgrestSingleResponse<Comment>> {
        throw new Error("Method not implemented.");
    }
    fetchEventAttendance(eventId: number): Promise<PostgrestSingleResponse<FullAttendance[]>> {
        throw new Error("Method not implemented.");
    }

}

export { SupabaseEventRepository, EmptyEventRepository, IEventRepository }