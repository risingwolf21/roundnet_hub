BEGIN;
SELECT plan(5);

\set g '00000000-0000-0000-0000-000000000042'
INSERT INTO public.event_group(id, name, visible, is_public) VALUES (:'g','SeriesGrp', true, true) ON CONFLICT DO NOTHING;

-- 3 Vorkommen gleicher Serie mit steigendem Datum
INSERT INTO public.events("key","title","description","startingDateTime","endDateTime","group","recurrence")
VALUES 
('series-s','S','—', now()+interval '1 day',  now()+interval '1 day 2 hours',  :'g','Weekly'),
('series-s','S','—', now()+interval '8 days', now()+interval '8 days 2 hours', :'g','Weekly'),
('series-s','S','—', now()+interval '15 days',now()+interval '15 days 2 hours',:'g','Weekly');

-- distinct_event zeigt nur jüngstes künftiges je key
SELECT is( (SELECT count(*) FROM public.distinct_event WHERE key='series-s'), 1::bigint, 'distinct_event 1 Eintrag');

-- current_distinct_event zeigt „nächstes“ in Zeitnähe je Key
SELECT is( (SELECT count(*) FROM public.current_distinct_event WHERE key='series-s'), 1::bigint, 'current_distinct_event 1 Eintrag');

-- Neuere in ferner Zukunft dürfen die Sicht auf „nächstes“ nicht kapern
-- (Semantik deiner View: sortiert per „Abstand zu now()“).
SELECT ok( EXISTS (
  SELECT 1 FROM public.current_distinct_event 
  WHERE key='series-s' AND "startingDateTime" > now()
), 'current_distinct_event ist zukunftsnah');

-- Sichten existieren und laufen ohne Fehler
SELECT ok( (SELECT COUNT(*) FROM public.distinct_event) >= 1, 'distinct_event liefert Daten');
SELECT ok( (SELECT COUNT(*) FROM public.current_distinct_event) >= 1, 'current_distinct_event liefert Daten');

SELECT * FROM finish();
ROLLBACK;
