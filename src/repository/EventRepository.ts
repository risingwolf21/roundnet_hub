import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { add, Duration, startOfDay } from 'date-fns';
import moment from 'moment/moment';
import { Event } from 'types/supabase';
import { supabase } from '../components/services/supabase/supabaseClient';
import { TablesInsert, TablesUpdate } from '../types/supabase-generated.types';
import { EventWithGroup, FullAttendance, FullComment } from '../types/supabaseTypes';
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
      .returns<Event[]>();

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

  async fetchEventComments(eventId: string): Promise<PostgrestSingleResponse<FullComment[]>> {
    return supabase
      .from('event_comments')
      .select('user(userId, displayName, avatarUrl), *')
      .eq('event', eventId)
      .order("last_update", { ascending: false })
      .returns<FullComment[]>()
      .throwOnError();
  },

  async fetchSingleComment(commentId: string): Promise<PostgrestSingleResponse<FullComment>> {
    return supabase
      .from('event_comments')
      .select('user(userId, displayName, avatarUrl), *')
      .eq('id', commentId)
      .returns<FullComment>()
      .single()
      .throwOnError();
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
  ): Promise<PostgrestSingleResponse<FullComment>> {
    return supabase
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

  async deleteEvent(eventId: string): Promise<PostgrestSingleResponse<null>> {
    return supabase.from('events').delete().eq('id', eventId).throwOnError();
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

  async updateCancellationForEvent(eventId: string, isCancelled: boolean): Promise<PostgrestSingleResponse<null>> {
    return supabase.from('events').update({ isCancelled: isCancelled }).eq('id', eventId).throwOnError();
  },

  async fetchEvents(fetchMode: 'upcoming' | 'past'): Promise<PostgrestSingleResponse<FullEvent[]>> {
    if (fetchMode === "upcoming")
      return this.fetchUpcomingEvents();
    else
      return this.fetchPastEvents();
  },

  async fetchUpcomingEvents(): Promise<PostgrestSingleResponse<FullEvent[]>> {
    return (
      fetchEvents()
        // get events that are on the same day or later
        .gt('startingDateTime', formatDateToDatabase(startOfDay(new Date())))
        .or(`recurrenceEnd.is.null,recurrenceEnd.gt.'${formatDateToDatabase(new Date())}'`)
        .lt('startingDateTime', formatDateToDatabase(add(new Date(), { weeks: 3 })))
        .order('startingDateTime', { ascending: true })
        .returns<FullEvent[]>()
        .throwOnError()
    );
  },

  async fetchPastEvents(): Promise<PostgrestSingleResponse<FullEvent[]>> {
    return fetchEvents()
      .lt('startingDateTime', formatDateToDatabase(new Date()))
      .gt('startingDateTime', formatDateToDatabase(add(new Date(), { weeks: -3 })))
      .order('startingDateTime', { ascending: false })
      .returns<FullEvent[]>()
      .throwOnError();
  },

  async fetchUserGroups(user: User): Promise<PostgrestSingleResponse<{ user: { userId: string }; group: Group }[]>> {
    return supabase
      .from('group_user_mapping')
      .select('user(userId), group(*)')
      .eq('user.userId', user.userId)
      .not('user', 'is', null)
      .returns<{ user: { userId: string }; group: Group }[]>()
      .throwOnError();
  },

  async fetchEventAttendance(eventId: string): Promise<PostgrestSingleResponse<FullAttendance[]>> {
    return supabase
      .from('event_attendance_user_mapping')
      .select('user(userId, displayName, avatarUrl, name), *')
      .eq('event', eventId)
      .returns<FullAttendance[]>()
      .throwOnError();
  },

  async fetchSingleEvent(eventId: string): Promise<PostgrestSingleResponse<FullEvent>> {
    return fetchEvents().eq('id', eventId).single<FullEvent>().throwOnError();
  },

  async fetchRecurringEvents(): Promise<PostgrestSingleResponse<EventWithGroup[]>> {
    return supabase
      .from('current_distinct_event')
      .select('*, fullGroup: event_group(id, created_at, description, name, color)')
      .returns<EventWithGroup[]>()
      .throwOnError();
  },
};
