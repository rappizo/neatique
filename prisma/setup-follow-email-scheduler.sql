create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'follow-emails-every-30-minutes'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end
$$;

select cron.schedule(
  'follow-emails-every-30-minutes',
  '*/30 * * * *',
  $job$
    select net.http_get(
      url := '__SITE_URL__/api/cron/follow-emails',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer __CRON_SECRET__'
      ),
      timeout_milliseconds := 60000
    ) as request_id;
  $job$
);
