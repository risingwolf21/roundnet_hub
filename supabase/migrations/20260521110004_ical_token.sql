ALTER TABLE public.user
  ADD COLUMN IF NOT EXISTS ical_token uuid NOT NULL DEFAULT gen_random_uuid();
