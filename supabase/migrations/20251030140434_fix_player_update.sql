drop policy "players_update_self" on "games"."players";

create policy "players_update_self"
on "games"."players"
as permissive
for update
to public
using ((player = (( SELECT auth.uid() AS uid))::text));

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.invoke_edge_function(p_function_name text, p_body jsonb DEFAULT '{}'::jsonb, p_timeout_ms integer DEFAULT 5000)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  v_base   text;
  v_token  text;
  v_url    text;
  v_req_id bigint;
  v_headers jsonb;
begin
  -- Secrets zur Laufzeit aus Vault holen
  select decrypted_secret into v_base
  from vault.decrypted_secrets
  where name = 'EDGE_BASE_URL' limit 1;

  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name = 'EDGE_BEARER' limit 1;

  if v_base is null or v_token is null then
    raise warning 'Missing Vault secrets EDGE_BASE_URL or EDGE_BEARER';
    return -1;
  end if;

  v_url := rtrim(v_base, '/') || '/functions/v1/' || p_function_name;

  v_headers := jsonb_build_object(
    'Content-Type','application/json',
    'Authorization','Bearer ' || v_token
  );

  -- Asynchroner HTTP-POST (Start nach COMMIT der TX)
  select net.http_post(
           url := v_url,
           body := coalesce(p_body, '{}'::jsonb),
           headers := v_headers,
           timeout_milliseconds := p_timeout_ms
         )
    into v_req_id;

  return v_req_id;
end;$function$
;


