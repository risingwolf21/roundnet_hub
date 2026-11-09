## 📋 Table of Contents

- [Overview](#overview)
- [Notifications](#notifications)

## 🎯 Overview

## Notifications

### Neue Benachrichtigung hinzufügen (Trigger -> notify_* Funktion -> Preferences)

- **Topic-basierte Notifications** (z.B. `event.updated`)
- Opt-Out/Opt-In über `notifications.user_notification_preferences`
- Entscheidung, ob eine Notification gesendet werden darf, über\
  `notifications.is_topic_enabled_for_user(user, tenant, topic, scope_type, scope_id)`\
  (wenn **kein** Preference-Eintrag existiert, ist **default = true**)

#### Notify_* Funktion (Beispiel)

```sql
create or replace function notifications.notify_<dein_event>(
  p_some_id uuid,
  p_actor uuid default null
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_topic text := '<dein.topic>';
  v_title text := '<Titel>';
  v_body  text := '<Body>';
  v_url   text := '<deeplink>';
  v_recipients uuid[];
begin
  -- 1) Recipients bestimmen (Beispiel: group_user_mapping mit Rollenfilter)
  v_recipients := array(
    select distinct gum."user"
    from public.group_user_mapping gum
    where gum."group" = <group_uuid>
      and gum.role in ('admin','user','trial')
      and (p_actor is null or gum."user" <> p_actor)
  );

  -- 2) Emit
  return notifications.notify_emit(
    v_recipients,
    v_topic,
    v_title,
    v_body,
    jsonb_build_object(
      'url', v_url,
      '<some_id_key>', p_some_id
    ),
    '<source_type>',
    p_some_id,
    '<urgency>',     -- z.B. 'normal' | 'high'
    '<scope_type>',  -- z.B. 'group'
    <scope_id_uuid>  -- z.B. group uuid
  );
end;
$$;
```

#### Trigger

```sql
create or replace function notifications.trg_notify_event_comment_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- NEW / OLD je nach Trigger-Event nutzen
  perform notifications.notify_event_comment_created(
    NEW.event_id,
    NEW.id,
    NEW.text,
    NEW.author_id
  );

  return NEW;
end;
$$;

drop trigger if exists trg_event_comment_created_notify on public.events_comments;

create trigger trg_event_comment_created_notify
after insert on public.events_comments
for each row
execute function notifications.trg_notify_event_comment_created();
```

#### Notification Preference anlegen

Nimm einen stabilen Topic-String, z.B.

- `group.request.received`
- `event.comment.created`
- `challenge.entry.added`

Wenn Preferences je “Objekt” gelten sollen:

- `scope_type = 'group'` und `scope_id = <group_uuid>`
- `scope_type = 'event'` und `scope_id = <event_uuid>`
- `scope_type = 'challenge'` und `scope_id = <challenge_uuid>`

```sql
insert into notifications.notification_topics (
  "topic", "description", "scope_type", "default_enabled"
) values (
  '<topic>',
  '<description>',
  '<scope_type>',
  true,
);
```
