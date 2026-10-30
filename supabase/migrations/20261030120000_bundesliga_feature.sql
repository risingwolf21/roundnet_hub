-- Register the "bundesliga" feature (match-day lineup planner). Only makes it selectable;
-- activate it per account/group via the admin grants UI or:
--   INSERT INTO public.group_features("group","feature") VALUES ('<group-uuid>','bundesliga');
INSERT INTO public.features(name) VALUES ('bundesliga') ON CONFLICT DO NOTHING;
