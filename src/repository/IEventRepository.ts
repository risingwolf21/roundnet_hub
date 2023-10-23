import { FullAttendance, FullEvent, Group, User } from "../types/supabaseTypes";
import { PostgrestSingleResponse, SupabaseClient } from '@supabase/supabase-js';
import moment from "moment";
import { PostgrestError } from '@supabase/supabase-js'
import { injectable } from "inversify";
import { ClientUser } from "../types/types";
import { ClientEventId } from "../redux/eventSlice";

export type DbResult<T> = T extends PromiseLike<infer U> ? U : never
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? Exclude<U, null> : never
export type DbResultErr = PostgrestError

interface IEventRepository {
    fetchEvents(client: SupabaseClient, user: User, userGroups: number[], page: number, count: number): Promise<PostgrestSingleResponse<FullEvent[]>>
}

@injectable()
class SupabaseRepository implements IEventRepository {
    async fetchEvents(client: SupabaseClient, user: User, userGroups: number[], page: number, count: number): Promise<PostgrestSingleResponse<FullEvent[]>> {
        const query = await client.from("events").select("*, attendance: event_attendance_user_mapping ( state , user(userId, displayName)  ), comments: event_comments ( comment, created_at, displayName, event, user ( displayName, userId)), groups: event_group(*)")
            // get events that are on the same day or later
            .gt("startingDateTime", moment().format("yyyy-MM-DD HH:mm:ssZ"))
            .range(page * count, page * count + count - 1)
            .order("startingDateTime", { ascending: true })
            .returns<FullEvent[]>();

        return query;
    }

    async fetchUserGroups({ client, user }: ClientUser) {
        const response = await client.from("group_user_mapping")
            .select("user(userId), group(*)")
            .eq("user.userId", user.userId)
            .returns<{ user: { userId: string }, group: Group }[]>();
        return (response.data ?? []).map(x => x.group);
    }

    async fetchEventAttendance({ client, eventId }: ClientEventId) {
        const response = await client.from("event_attendance_user_mapping")
            .select("user(userId, displayName), event, state")
            .eq("event", eventId)
            .returns<FullAttendance[]>();
        return response.data;
    }

    async fetchSingleEvent({ client, eventId }: ClientEventId) {
        const response = await client.from("events")
            .select("*, attendance: event_attendance_user_mapping ( state , user(userId, displayName)  ), comments: event_comments ( comment, created_at, displayName, event, user ( displayName, userId))")
            .eq("id", eventId)
            .returns<FullEvent[]>()
            .limit(1);
        return response.data;
    }

}

@injectable()
class EmptyRepository implements IEventRepository {
    fetchEvents(client: SupabaseClient, user: User, userGroups: number[], page: number, count: number): Promise<PostgrestSingleResponse<FullEvent[]>> {
        throw Error("asdf")
    }
}

export { SupabaseRepository, EmptyRepository, IEventRepository }