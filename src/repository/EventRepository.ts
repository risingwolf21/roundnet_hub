import { supabase } from '@/lib/supabase';
import { formatDateToDatabase } from '@/utils';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { add, differenceInCalendarDays, Duration, isAfter, set, startOfDay, sub } from 'date-fns';
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

const assertRowsAffected = (rows: unknown[] | null, message: string) => {
  if (!rows || rows.length === 0) {
    throw new Error(`${message} (fehlende Berechtigung oder Event nicht sichtbar).`);
  }
};

export const EventRepository = {
  /**
   * Applies `updates` to the event series identified by `key`, starting with the occurrence that
   * originally started at `oldStartTime` (the anchor). Date changes are applied relative to the anchor
   * so every following occurrence keeps its own day while getting the new time-of-day / offsets.
   */
  async updateEventAndAllRecurrences(updates: TablesUpdate<'events'>, key: string, oldStartTime: string) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('key', key)
      .gte('startingDateTime', oldStartTime)
      .order('startingDateTime', { ascending: true })
      .returns<EventTable[]>();

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Die Events der Serie konnten nicht gefunden werden (fehlende Berechtigung oder bereits gelöscht).');
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

    const anchor = data[0];
    const anchorOldStart = new Date(anchor.startingDateTime);
    const anchorNewStart = updates.startingDateTime ? new Date(updates.startingDateTime) : anchorOldStart;
    const recurrenceChanged = !!updates.recurrence && updates.recurrence !== anchor.recurrence;
    const dayShift = differenceInCalendarDays(anchorNewStart, anchorOldStart);
    const timeOf = (date: Date) => ({
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
      milliseconds: 0,
    });

    // Positions a date field of the anchor relative to the (new) start of another occurrence,
    // using calendar days + wall-clock time so DST changes don't shift the time-of-day.
    const relativeTo = (occurrenceStart: Date, anchorValue: string) => {
      const value = new Date(anchorValue);
      return formatDateToDatabase(
        set(add(occurrenceStart, { days: differenceInCalendarDays(value, anchorNewStart) }), timeOf(value))
      );
    };

    const dateFieldsChanged =
      !!updates.startingDateTime || !!updates.endDateTime || !!updates.meetingDateTime || !!updates.answerDeadline;

    const changesFor = (e: EventTable, index: number): TablesUpdate<'events'> => {
      if (!dateFieldsChanged && !recurrenceChanged) return updates;

      const startChanged = !!updates.startingDateTime || recurrenceChanged;
      const newStart = recurrenceChanged
        ? add(anchorNewStart, recurrenceFrom(updates.recurrence!, index))
        : updates.startingDateTime
          ? set(add(new Date(e.startingDateTime), { days: dayShift }), timeOf(anchorNewStart))
          : new Date(e.startingDateTime);

      return {
        ...updates,
        ...(startChanged && { startingDateTime: formatDateToDatabase(newStart) }),
        ...(updates.endDateTime && { endDateTime: relativeTo(newStart, updates.endDateTime) }),
        ...(updates.meetingDateTime && { meetingDateTime: relativeTo(newStart, updates.meetingDateTime) }),
        ...(updates.answerDeadline && { answerDeadline: relativeTo(newStart, updates.answerDeadline) }),
      };
    };

    const planned = data.map((e, index) => ({ id: e.id, changes: changesFor(e, index) }));

    // (key, startingDateTime) is unique: when moving a series later, update the latest occurrence first
    // (and vice versa) so an occurrence never collides with the not-yet-moved next one.
    if (isAfter(anchorNewStart, anchorOldStart)) planned.reverse();

    const updatedEvents: Tables<'events'>[] = [];
    for (const { id, changes } of planned) {
      const result = await supabase
        .from('events')
        .update(changes)
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) {
        throw new Error('Event konnte nicht gespeichert werden (fehlende Berechtigung oder Event nicht sichtbar).');
      }
      updatedEvents.push(result.data);
    }
    return updatedEvents;
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

  async deleteEvent(eventId: string): Promise<void> {
    const result = await supabase.from('events').delete().eq('id', eventId).select('id').throwOnError();
    assertRowsAffected(result.data, 'Event konnte nicht gelöscht werden');
  },

  async deleteEventAndUpcomingEvents(key: string, startDateTime: string): Promise<void> {
    const result = await supabase
      .from('events')
      .delete()
      .eq('key', key)
      .gte('startingDateTime', startDateTime)
      .select('id')
      .throwOnError();
    assertRowsAffected(result.data, 'Events konnten nicht gelöscht werden');

    // End the series on the remaining occurrences, otherwise create_next_occurrences would
    // regenerate the deleted events from the latest remaining occurrence.
    await supabase
      .from('events')
      .update({
        recurrenceEnd: formatDateToDatabase(sub(new Date(startDateTime), { seconds: 1 })),
      })
      .eq('key', key)
      .lt('startingDateTime', startDateTime)
      .throwOnError();
  },

  async updateCancellationForEvent(eventId: string, isCancelled: boolean): Promise<void> {
    const result = await supabase
      .from('events')
      .update({ isCancelled: isCancelled })
      .eq('id', eventId)
      .select('id')
      .throwOnError();
    assertRowsAffected(result.data, 'Event konnte nicht aktualisiert werden');
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
    const result = await supabase.from('event_bring_overview').select('*').eq('event', eventId).throwOnError();
    return result.data ?? [];
  },

  async fetchBringItems(eventId: string) {
    const result = await supabase.from('event_bring_items').select('*').eq('event', eventId).throwOnError();
    return result.data ?? [];
  },

  async fetchBringPledges(eventId: string) {
    const result = await fetchEventBringPledges()
      .eq('event', eventId)
      .throwOnError();
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
      .maybeSingle()
      .throwOnError();
    return result.data;
  },

  async fetchEventTransformationApplication(event: string) {
    const result = await supabase
      .schema('public')
      .from('event_transformation_applications')
      .select('*')
      .eq('event', event)
      .maybeSingle()
      .throwOnError();
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
    const removed = items.filter((x) => x.quantity <= 0).map((x) => x.item_id);
    const pledged = items
      .filter((x) => x.quantity > 0)
      .map((x) => ({ event, user: user, qty: x.quantity, status: x.status, item: x.item_id }));

    if (removed.length > 0) {
      await supabase
        .from('event_bring_pledges')
        .delete()
        .eq('event', event)
        .eq('user', user)
        .in('item', removed)
        .throwOnError();
    }
    if (pledged.length > 0) {
      await supabase.from('event_bring_pledges').upsert(pledged).throwOnError();
    }
  },

  async insertEventWithBringItems(p_event: TablesInsert<'events'>, p_items: { name: string; required_qty: number; unit: string; notes: string | null; sort_order: number }[]) {
    const result = await supabase.rpc('insert_event_with_bring_items', { p_event, p_items }).throwOnError();
    return result.data;
  },

  async syncEventBringItems(
    eventId: string,
    items: Array<{ id?: string | null; name: string; required_qty: number | null; unit: string; notes: string | null; sort_order: number }>
  ) {
    const keepIds = items.filter(x => x.id).map(x => x.id!);
    if (keepIds.length > 0) {
      await supabase
        .from('event_bring_items')
        .delete()
        .eq('event', eventId)
        .not('id', 'in', `(${keepIds.join(',')})`)
        .throwOnError();
    } else {
      await supabase.from('event_bring_items').delete().eq('event', eventId).throwOnError();
    }
    if (items.length > 0) {
      await supabase.from('event_bring_items').upsert(
        items.map((item, i) => ({
          ...(item.id ? { id: item.id } : {}),
          event: eventId,
          name: item.name,
          required_qty: item.required_qty ?? 0,
          unit: item.unit || 'Stk.',
          notes: item.notes ?? null,
          sort_order: item.sort_order ?? i,
        }))
      ).throwOnError();
    }
  },

  async updateSingleEvent(id: string, eventChanges: TablesUpdate<'events'>) {
    const result = await supabase.from('events').update(eventChanges).eq('id', id).select().throwOnError();
    // RLS silently filters rows instead of raising an error, so 0 updated rows means nothing was saved.
    assertRowsAffected(result.data, 'Event konnte nicht gespeichert werden');
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
