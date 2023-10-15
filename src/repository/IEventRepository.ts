import { FullEvent, User } from "../types/supabase";
import { SupabaseClient } from '@supabase/supabase-js';
import moment from "moment";
import { PostgrestError } from '@supabase/supabase-js'
import { injectable } from "inversify";

export type DbResult<T> = T extends PromiseLike<infer U> ? U : never
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? Exclude<U, null> : never
export type DbResultErr = PostgrestError

interface IEventRepository {
    test(): void
    fetchEvents(client: SupabaseClient, user: User, userGroups: number[], page: number, count: number): Promise<FullEvent[] | null>
}

@injectable()
class SupabaseRepository implements IEventRepository {
    test(): void {
        console.log("SupabaseRepository")
    }
    async fetchEvents(client: SupabaseClient, user: User, userGroups: number[], page: number, count: number): Promise<FullEvent[] | null> {
        const query = await client.from("events").select("*, attendance: event_attendance_user_mapping ( state , user(userId, displayName)  ), comments: event_comments ( comment, created_at, displayName, event, user ( displayName, userId)), groups: event_group(*)")
            // get events that are on the same day or later
            .gt("startingDateTime", moment().format("yyyy-MM-DD HH:mm:ssZ"))
            .range(page * count, page * count + count - 1)
            .order("startingDateTime", { ascending: true })
            .returns<FullEvent[]>();

        return query.data;
    }

}

@injectable()
class EmptyRepository implements IEventRepository {
    test(): void {
        console.log("EmptyRepository")
    }
    fetchEvents(client: SupabaseClient, user: User, userGroups: number[], page: number, count: number): Promise<FullEvent[] | null> {
        return Promise.resolve([]);
    }
}

export { SupabaseRepository, EmptyRepository, IEventRepository }