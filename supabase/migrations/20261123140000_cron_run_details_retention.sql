-- pg_cron logs every run in cron.job_run_details and never deletes it. push_worker_quick alone runs
-- every minute (1440 rows a day), so the table only grows. Keep 7 days of history, nightly.

do $$
begin
  perform cron.unschedule('cron_run_details_retention');
exception when others then
  null;  -- not scheduled yet
end $$;

-- 04:15 UTC: after the other nightly jobs (01:45–03:45).
select cron.schedule(
  'cron_run_details_retention',
  '15 4 * * *',
  $$ delete from cron.job_run_details where end_time < now() - interval '7 days'; $$
);
