import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { add, Duration, startOfDay } from 'date-fns';
import moment from 'moment/moment';
import { EventTable } from 'types/supabase';
import { supabase } from '../components/services/supabase/supabaseClient';
import { TablesInsert, TablesUpdate } from '../types/supabase-generated.types';
import { EventsUserView, EventWithGroup, FullComment } from '../types/supabaseTypes';
import { formatDateToDatabase } from '../utils';

export const fetchEvents = () => supabase
  .from('events')
  .select(
    '*, fullGroup: event_group(id, created_at, description, name, color), attendance: event_attendance_user_mapping ( state , user(userId, displayName, avatarUrl)  ), comments: event_comments ( comment, created_at, displayName, event, user ( displayName, userId, avatarUrl))'
  );

export const SupabaseEventRepository = {
  async updateEventAndAllRecurrences(updates: TablesUpdate<'events'>, key: string, oldStartTime: string) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('key', key)
      .gte("startingDateTime", oldStartTime)
      .returns<EventTable[]>();

    if (!data || error) {
      throw new Error('Could not fetch events that need to be updated!')
    }

    const recurrenceFrom = (recurrence: EventRecurrence, index: number): Duration => {
      switch (recurrence) {
        case 'Monthly':
          return { months: index };
        case 'Weekly':
          return { days: index * 7 };
        case 'Fortnightly':
          return { days: index * 14 };
        default:
        case 'None':
          return { days: 0 };
      }
    };

    return Promise.all(data.map(async (e, index) => {
      const updatedChanges = {
        ...updates,
        ...((updates.startingDateTime) && {
          startingDateTime: formatDateToDatabase(
            add(updates.startingDateTime, recurrenceFrom(updates.recurrence ?? e.recurrence, index))
          )
        }),
        ...((updates.endDateTime) && {
          endDateTime: formatDateToDatabase(
            add(updates.endDateTime, recurrenceFrom(updates.recurrence ?? e.recurrence, index))
          )
        }),
        ...((updates.meetingDateTime) && {
          meetingDateTime: formatDateToDatabase(
            add(updates.meetingDateTime, recurrenceFrom(updates.recurrence ?? e.recurrence, index))
          )
        }),
        ...((updates.answerDeadline) && {
          answerDeadline: formatDateToDatabase(
            add(updates.answerDeadline, recurrenceFrom(updates.recurrence ?? e.recurrence, index))
          )
        }),
      } as TablesUpdate<'events'>;
      const result = await supabase.from('events').update(updatedChanges).eq("id", e.id).select("*").single().throwOnError();
      return result;
    }));
  },

  async updateEvent(eventId: string, event: TablesUpdate<'events'>): Promise<PostgrestSingleResponse<null>> {
    return supabase.from('events').update(event).eq('id', eventId).throwOnError();
  },

  async insertEvent(event: TablesInsert<'events'>): Promise<PostgrestSingleResponse<null>> {
    return supabase.from('events').insert(event).throwOnError();
  },

  async insertComment(
    user: User,
    eventId: string,
    comment: string,
    reply_to: string | null
  ): Promise<FullComment | null> {
    const result = await supabase
      .from('event_comments')
      .insert({
        user: user.userId,
        event: eventId,
        comment: comment,
        displayName: user.displayName ?? '',
        reply_to: reply_to,
      })
      .select('user(userId, displayName, avatarUrl), *')
      .single<FullComment>()
      .throwOnError();

    return result.data;
  },

  async updateAttendance(
    userId: string,
    eventId: string,
    state: EventAttendance
  ): Promise<PostgrestSingleResponse<EventAttendance>> {
    return supabase
      .rpc('update_attendance', {
        eventid: eventId,
        userid: userId,
        state,
      })
      .returns<EventAttendance>()
      .throwOnError();
  },

  async deleteEvent(eventId: string): Promise<null> {
    const result = await supabase.from('events').delete().eq('id', eventId).throwOnError();

    return result.data;
  },

  async deleteEventAndUpcomingEvents(eventId: string, key: string, startDateTime: string | null): Promise<void> {
    await supabase.from('events').delete().eq('key', key).gt('startingDateTime', startDateTime);

    await supabase
      .from('events')
      .update({
        recurrenceEnd: moment().format('yyyy-MM-DD HH:mm:ssZ'),
      })
      .eq('id', eventId);
  },

  async updateCancellationForEvent(eventId: string, isCancelled: boolean): Promise<null> {
    const result = await supabase.from('events').update({ isCancelled: isCancelled }).eq('id', eventId).throwOnError();

    return result.data;
  },

  async fetchUserEvent(eventId: string): Promise<EventsUserView | null> {
    const result = await supabase
      .schema("public")
      .from("events_user_view")
      .select("*")
      .eq("id", eventId)
      .single()
      .throwOnError();

    if (result.data) {
      const { data: group } = await supabase
        .schema("public")
        .from("event_group")
        .select("*")
        .eq("id", result.data.group ?? "")
        .maybeSingle();

      return {
        ...result.data,
        group: group
      } as EventsUserView
    }
    return null;
  },

  async fetchUserEvents(fetchMode: 'past' | 'upcoming'): Promise<EventsUserView[]> {
    let query = supabase.schema("public").from("events_user_view").select("*").throwOnError();

    if (fetchMode === "past") {
      query = query
        .lt('startingDateTime', formatDateToDatabase(new Date()))
        .gt('startingDateTime', formatDateToDatabase(add(new Date(), { weeks: -3 })))
        .order('startingDateTime', { ascending: false })
    } else {
      query = query
        .gt('startingDateTime', formatDateToDatabase(startOfDay(new Date())))
        .lt('startingDateTime', formatDateToDatabase(add(new Date(), { weeks: 3 })))
        .order('startingDateTime', { ascending: true })
    }

    const result = await query;

    if (result.data) {
      const foundGroups = [...new Set(result.data.map(x => x.group).filter(x => x !== null))]
      const { data: groups } = await supabase
        .schema("public")
        .from("event_group")
        .select("*")
        .in("id", foundGroups);

      return result.data.map(r => {
        return {
          ...r,
          group: groups?.find(x => x.id === r.group) ?? null
        } as EventsUserView
      })
    }
    return [];
  },

  async fetchRecurringEvents(): Promise<EventWithGroup[]> {
    const result = await supabase
      .from('current_distinct_event')
      .select('*, fullGroup: event_group(id, created_at, description, name, color)')
      .returns<EventWithGroup[]>()
      .throwOnError();

    return result.data ?? [];
  },
};
