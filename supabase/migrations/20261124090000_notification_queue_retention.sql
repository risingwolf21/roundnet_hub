-- The push queue (notification_outbox + its targets) and revoked devices were never cleaned up. Once a push is
-- delivered its queue rows are only bookkeeping, so delete them nightly, using the ages already stored in
-- notifications.notification_retention (7 days for sent jobs, 30 days for revoked devices). Undeliverable ('dead')
-- jobs are kept 30 days so failures can still be looked into. The in-app inbox (notifications.notifications) is
-- not touched. Targets go with their job and device (on delete cascade).
create or replace function notifications.run_retention()
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_keep_sent    interval;
  v_keep_revoked interval;
begin
  select keep_sent_outbox_for, keep_revoked_sub_for
    into v_keep_sent, v_keep_revoked
    from notifications.notification_retention
   order by id
   limit 1;

  delete from notifications.notification_outbox
   where (status in ('sent', 'no_subscriptions')
          and coalesce(sent_at, created_at) < now() - coalesce(v_keep_sent, interval '7 days'))
      or (status = 'dead' and created_at < now() - interval '30 days');

  delete from notifications.web_push_subscriptions
   where revoked_at < now() - coalesce(v_keep_revoked, interval '30 days');
end;
$function$;

revoke all on function notifications.run_retention() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('notification_retention');
exception when others then
  null;  -- not scheduled yet
end $$;

-- 04:00 UTC: between the audit log (03:30) and cron history (04:15) clean-ups.
select cron.schedule(
  'notification_retention',
  '0 4 * * *',
  $$ select notifications.run_retention(); $$
);
