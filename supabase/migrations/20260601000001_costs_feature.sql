INSERT INTO public.features(name)
VALUES ('costs')
ON CONFLICT DO NOTHING;
