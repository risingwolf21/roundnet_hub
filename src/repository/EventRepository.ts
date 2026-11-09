import { supabase } from '@/lib/supabase';
import { RecurrenceExpander } from '@/lib/recurrence-expander';
import { formatDateToDatabase } from '@/utils';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { add, differenceInCalendarDays, Duration, isAfter, set, startOfDay, sub } from 'date-fns';
import { t } from 'i18next';
import { EventTable } from 'types/supabase';
import { Json, Tables, TablesInsert, TablesUpdate } from '../types/supabase-generated.types';
import { EventsUserView, FullAttendance, FullComment } from '../types/supabaseTypes';

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
    throw new Error(message);
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
      throw new Error(t('events.repositoryErrors.seriesNotFound'));
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
      !!updates.startingDateTime || !!updates.endDateTime || !!updates.meetingDateTime || !!updates.answerDeadline || !!updates.answerStart;

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
        ...(updates.answerStart && { answerStart: relativeTo(newStart, updates.answerStart) }),
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
        throw new Error(t('events.repositoryErrors.saveFailed'));
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
    assertRowsAffected(result.data, t('events.repositoryErrors.deleteFailed'));
  },

  async deleteEventAndUpcomingEvents(key: string, startDateTime: string): Promise<void> {
    const result = await supabase
      .from('events')
      .delete()
      .eq('key', key)
      .gte('startingDateTime', startDateTime)
      .select('id')
      .throwOnError();
    assertRowsAffected(result.data, t('events.repositoryErrors.deleteManyFailed'));

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
    assertRowsAffected(result.data, t('events.repositoryErrors.updateFailed'));
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

  /** Active series with their group and their occurrences in [from, to). */
  async fetchSeriesOverview(from: Date, to: Date) {
    const result = await supabase
      .from('event_series')
      .select('id, title, rrule, dtstart, until, fullGroup: event_group(id, name, color), occurrences: events(id, startingDateTime, endDateTime, isCancelled, detached)')
      .eq('active', true)
      .gte('occurrences.startingDateTime', formatDateToDatabase(from))
      .lt('occurrences.startingDateTime', formatDateToDatabase(to))
      .order('startingDateTime', { referencedTable: 'occurrences' })
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
    assertRowsAffected(result.data, t('events.repositoryErrors.saveFailed'));
    return result.data;
  },

  async createNextOccurrences() {
    const result = await supabase.rpc('create_next_occurrences', {
      p_horizon: '30 days',
      p_run_at: formatDateToDatabase(new Date()),
    }).throwOnError();
    return result.data ?? [];
  },

  /**
   * Materialize occurrences for one series (or every series the caller may edit, when omitted).
   * The RRULE is expanded in the browser (RecurrenceExpander); the DB only applies the slots via
   * the authorized expand_series RPC. Replaces the former edge function.
   */
  async expandRecurrences(
    seriesId?: string,
    mode: 'fill' | 'sync' = 'fill'
  ): Promise<{ processed: number }> {
    const { data: series } = await supabase
      .rpc('series_for_expansion', seriesId ? { p_series_id: seriesId } : {})
      .throwOnError();

    const now = new Date();
    const rangeEnd = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60-day horizon
    let processed = 0;

    for (const s of series ?? []) {
      const slots = RecurrenceExpander.expand(
        {
          rrule: s.rrule,
          dtstart: s.dtstart,
          timezone: s.timezone,
          until: s.until,
          durationMs: Math.round((s.duration_s ?? 0) * 1000),
          meetingOffsetMs: s.meeting_offset_s != null ? Math.round(s.meeting_offset_s * 1000) : null,
          answerOffsetMs: s.answer_offset_s != null ? Math.round(s.answer_offset_s * 1000) : null,
          answerStartOffsetMs:
            s.answer_start_offset_s != null ? Math.round(s.answer_start_offset_s * 1000) : null,
        },
        now,
        rangeEnd
      );
      await supabase
        .rpc('expand_series', { p_series_id: s.id, p_slots: slots as unknown as Json, p_mode: mode })
        .throwOnError();
      processed += 1;
    }

    return { processed };
  },

  /** Create a recurring-series template, then materialize its occurrences. */
  async createSeries(series: TablesInsert<'event_series'>): Promise<Tables<'event_series'>> {
    const result = await supabase.from('event_series').insert(series).select('*').single().throwOnError();
    const created = result.data as Tables<'event_series'>;
    await EventRepository.expandRecurrences(created.id);
    return created;
  },

  /** Redefine a series (looked up by its stable key) and re-materialize its future occurrences. */
  async updateSeriesByKey(key: string, patch: TablesUpdate<'event_series'>): Promise<Tables<'event_series'>> {
    const result = await supabase.from('event_series').update(patch).eq('key', key).select('*').single().throwOnError();
    const updated = result.data as Tables<'event_series'>;
    // Deliberate template edit → propagate to the future occurrences (move/prune).
    await EventRepository.expandRecurrences(updated.id, 'sync');
    return updated;
  },

  /**
   * End a series just before `fromIso` (the first occurrence to drop) and let the expander
   * prune/cancel the now-removed future occurrences.
   */
  async endSeriesByKey(key: string, fromIso: string): Promise<void> {
    const until = formatDateToDatabase(sub(new Date(fromIso), { seconds: 1 }));
    const result = await supabase
      .from('event_series')
      .update({ until })
      .eq('key', key)
      .select('id')
      .throwOnError();
    assertRowsAffected(result.data, t('events.repositoryErrors.endSeriesFailed'));
    // Ending a series must drop/cancel the now-removed future occurrences → sync.
    await EventRepository.expandRecurrences((result.data as { id: string }[])[0].id, 'sync');
  },
};
