import { supabase } from '@/lib/supabase';
import { formatDateToDatabase } from '@/utils';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { add, Duration, startOfDay } from 'date-fns';
import { EventTable } from 'types/supabase';
import { Tables, TablesInsert, TablesUpdate } from '../types/supabase-generated.types';
import { EventsUserView, EventWithGroup, FullAttendance, FullComment } from '../types/supabaseTypes';

export const fetchEvents = () =>
  supabase
    .from('events')
    .select(
      '*, fullGroup: event_group(id, created_at, description, name, color), attendance: event_attendance_user_mapping ( state , user(id, displayName, avatarUrl)  ), comments: event_comments ( comment, created_at, displayName, event, user ( displayName, id, avatarUrl))'
    );

export const fetchEventBringPledges = () => supabase
  .from('event_bring_pledges')
  .select('*, user: user(*), item: event_bring_items(*)')

export const EventRepository = {
  async updateEventAndAllRecurrences(updates: TablesUpdate<'events'>, key: string, oldStartTime: string) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('key', key)
      .gte('startingDateTime', oldStartTime)
      .returns<EventTable[]>();

    if (!data || error) {
      throw new Error('Could not fetch events that need to be updated!');
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

    return Promise.all(
      data.map(async (e, index) => {
        const updatedChanges = {
          ...updates,
          ...(updates.startingDateTime && {
            startingDateTime: formatDateToDatabase(
              add(updates.startingDateTime, recurrenceFrom(updates.recurrence ?? e.recurrence, index))
            ),
          }),
          ...(updates.endDateTime && {
            endDateTime: formatDateToDatabase(
              add(updates.endDateTime, recurrenceFrom(updates.recurrence ?? e.recurrence, index))
            ),
          }),
          ...(updates.meetingDateTime && {
            meetingDateTime: formatDateToDatabase(
              add(updates.meetingDateTime, recurrenceFrom(updates.recurrence ?? e.recurrence, index))
            ),
          }),
          ...(updates.answerDeadline && {
            answerDeadline: formatDateToDatabase(
              add(updates.answerDeadline, recurrenceFrom(updates.recurrence ?? e.recurrence, index))
            ),
          }),
        } as TablesUpdate<'events'>;
        const result = await supabase
          .from('events')
          .update(updatedChanges)
          .eq('id', e.id)
          .select('*')
          .single()
          .throwOnError();
        return result;
      })
    );
  },

  async updateEvent(
    eventId: string,
    event: TablesUpdate<'events'>
  ): Promise<PostgrestSingleResponse<Tables<'events'>[]>> {
    return supabase.from('events').update(event).eq('id', eventId).select('*').throwOnError();
  },

  async insertEvent(event: TablesInsert<'events'>): Promise<PostgrestSingleResponse<Tables<'events'>[]>> {
    return supabase.from('events').insert(event).select('*').throwOnError();
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
        user: user.id,
        event: eventId,
        comment: comment,
        displayName: user.displayName ?? '',
        reply_to: reply_to,
      })
      .select('user(id, displayName, avatarUrl), *')
      .single<FullComment>()
      .throwOnError();

    return result.data;
  },

  async updateAttendance(
    userId: string,
    eventId: string,
    state: EventAttendance
  ): Promise<PostgrestSingleResponse<Attendance[]>> {
    return supabase
      .rpc('update_attendance', {
        p_event: eventId,
        p_user: userId,
        p_state: state,
      })
      .throwOnError();
  },

  async deleteEvent(eventId: string): Promise<null> {
    const result = await supabase.from('events').delete().eq('id', eventId).throwOnError();

    return result.data;
  },

  async deleteEventAndUpcomingEvents(eventId: string, key: string, startDateTime: string | null): Promise<void> {
    await supabase.from('events').delete().eq('key', key).gte('startingDateTime', startDateTime);

    await supabase
      .from('events')
      .update({
        recurrenceEnd: formatDateToDatabase(Date.now()),
      })
      .eq('id', eventId);
  },

  async updateCancellationForEvent(eventId: string, isCancelled: boolean): Promise<null> {
    const result = await supabase.from('events').update({ isCancelled: isCancelled }).eq('id', eventId).throwOnError();

    return result.data;
  },

  async fetchUserEvent(eventId: string): Promise<EventsUserView | null> {
    const result = await supabase
      .schema('public')
      .from('events_user_view')
      .select('*, group: event_group(*)')
      .eq('id', eventId)
      .single()
      .throwOnError();

    if (result.data) {
      return result.data as unknown as EventsUserView;
    }
    return null;
  },

  async fetchUserEvents(fetchMode: 'past' | 'upcoming', limit?: number): Promise<EventsUserView[]> {
    let query = supabase.schema('public').from('events_user_view').select('*, group: event_group(*)').throwOnError();

    if (fetchMode === 'past') {
      query = query
        .lt('startingDateTime', formatDateToDatabase(new Date()))
        .gt('startingDateTime', formatDateToDatabase(add(new Date(), { weeks: -8 })))
        .order('startingDateTime', { ascending: false });
    } else {
      query = query
        .gt('startingDateTime', formatDateToDatabase(startOfDay(new Date())))
        .lt('startingDateTime', formatDateToDatabase(add(new Date(), { weeks: 8 })))
        .order('startingDateTime', { ascending: true });
    }

    if (limit) {
      query = query.limit(limit);
    }

    const result = await query;

    if (result.data) {
      return result.data.map((r) => ({
        ...r,
        max_attendees_trials: r.max_trial_attendees,
      } as unknown as EventsUserView));
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

  async fetchComments(eventId: string): Promise<FullComment[]> {
    const result = await supabase
      .from('event_comments')
      .select('user(id, displayName, avatarUrl), *')
      .eq('event', eventId)
      .order('last_update', { ascending: false })
      .returns<FullComment[]>()
      .throwOnError();
    return result.data ?? [];
  },

  async fetchBringOverview(eventId: string) {
    const result = await supabase.from('event_bring_overview').select('*').eq('event', eventId);
    return result.data ?? [];
  },

  async fetchBringItems(eventId: string) {
    const result = await supabase.from('event_bring_items').select('*').eq('event', eventId);
    return result.data ?? [];
  },

  async fetchBringPledges(eventId: string) {
    const result = await fetchEventBringPledges()
      .eq('event', eventId);
    return result.data ?? [];
  },

  async fetchUserAttendanceInMonth(userId: string, month: number) {
    const result = await supabase
      .from('event_attendance_user_mapping')
      .select('*, eventTime: events!inner(startingDateTime)')
      .eq('user', userId)
      .gte('events.startingDateTime', formatDateToDatabase(new Date(new Date().getFullYear(), month - 1, 1)))
      .lte('events.startingDateTime', formatDateToDatabase(new Date(new Date().getFullYear(), month, 0, 23, 59, 59)))
      .throwOnError();
    return result.data;
  },

  async fetchAttendance(eventId: string) {
    const result = await supabase
      .from('event_attendance_user_mapping')
      .select('user(id, displayName, avatarUrl, name), *')
      .eq('event', eventId)
      .returns<FullAttendance[]>()
      .throwOnError();
    return result.data ?? [];
  },

  async fetchEventTransformation(eventKey: string) {
    const result = await supabase
      .schema('public')
      .from('event_transformations')
      .select('*')
      .eq('event_key', eventKey)
      .maybeSingle();
    return result.data;
  },

  async fetchEventTransformationApplication(event: string) {
    const result = await supabase
      .schema('public')
      .from('event_transformation_applications')
      .select('*')
      .eq('event', event)
      .maybeSingle();
    return result.data;
  },

  async deleteEventTransformation(eventKey: string) {
    const result = await supabase
      .schema('public')
      .from('event_transformations')
      .delete()
      .eq('event_key', eventKey);
    if (result.error) throw result.error;
    return result.data;
  },

  async upsertEventTransformation(payload: {
    eventKey: string;
    userId: string;
    leadTime: string;
    newTitle: string;
    newDescription: string;
    newGroupId: string | null;
    disableAnswerDeadline: boolean;
    trigger: { attending_lt?: number };
    oneTime: boolean;
  }) {
    const result = await supabase
      .schema('public')
      .from('event_transformations')
      .upsert({
        event_key: payload.eventKey,
        created_by: payload.userId,
        lead_time: payload.leadTime,
        next: {
          title: payload.newTitle,
          description: payload.newDescription,
          group: payload.newGroupId,
          disableAnswerDeadline: payload.disableAnswerDeadline,
        },
        one_time: payload.oneTime,
        active: true,
        trigger: { attending_lt: payload.trigger.attending_lt },
      })
      .eq('event_key', payload.eventKey)
      .select('*')
      .single();
    if (result.error) throw result.error;
    return result.data;
  },

  async upsertBringPledges(event: string, user: string, items: { item_id: string; quantity: number; status: string }[]) {
    await supabase
      .from('event_bring_pledges')
      .delete()
      .eq('event', event)
      .eq('user_id', user)
      .in('item', items.filter((x) => x.quantity <= 0).map((x) => x.item_id));
    await supabase.from('event_bring_pledges').upsert(
      items
        .filter((x) => x.quantity > 0)
        .map((x) => ({ event, user_id: user, qty: x.quantity, status: x.status, item: x.item_id })),
      { onConflict: 'user_id, item' }
    );
  },

  async insertEventWithBringItems(p_event: TablesInsert<'events'>, p_items: { name: string; required_qty: number; unit: string; notes: string | null; sort_order: number }[]) {
    const result = await supabase.rpc('insert_event_with_bring_items', { p_event, p_items }).throwOnError();
    return result.data;
  },

  async updateSingleEvent(id: string, eventChanges: TablesUpdate<'events'>) {
    const result = await supabase.from('events').update(eventChanges).eq('id', id).select().throwOnError();
    return result.data;
  },

  async createNextOccurrences() {
    const result = await supabase.rpc('create_next_occurrences', {
      p_horizon: '30 days',
      p_run_at: formatDateToDatabase(new Date()),
    }).throwOnError();
    return result.data ?? [];
  },
};
