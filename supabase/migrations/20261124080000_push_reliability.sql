-- Push reliability: give stuck jobs back to the worker, and actually schedule the answer deadline reminders.

-- push-worker claims a job by setting it to 'processing' with next_attempt_at as a lease (now + 10 min). If its run
-- dies before finishing, the job used to stay 'processing' forever; after the lease it now goes back to 'pending'.
CREATE OR REPLACE FUNCTION public.run_push_worker_if_needed()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_has_work boolean;
  v_result bigint;
begin
  update notifications.notification_outbox
     set status = 'pending'
   where status = 'processing'
     and next_attempt_at <= now();

  select exists (
    select 1
      from notifications.notification_outbox_targets t
      join notifications.notification_outbox o on o.id = t.outbox_id
     where (t.last_status is null or t.last_status >= 400)           -- nie versucht oder fehlgeschlagen
       and (t.next_attempt_at is null or t.next_attempt_at <= now()) -- fällig
       and o.status = 'pending'
  )
  into v_has_work;

  if v_has_work then
    select * from public.invoke_edge_function('push-worker') into v_result;
    return json_build_object('request_id', v_result);
  else
    return jsonb_build_object('processed', 0, 'skipped', true);
  end if;
end;$function$;

-- send_answer_deadline_reminders() was never scheduled, so no reminder went out. A reminder fires once the deadline
-- is within the event's reminder_before, so it is at most 15 minutes late.
select cron.unschedule('answer_deadline_reminders')
where exists (select 1 from cron.job where jobname = 'answer_deadline_reminders');

select cron.schedule(
  'answer_deadline_reminders',
  '*/15 * * * *',
  $$select public.send_answer_deadline_reminders();$$
);
