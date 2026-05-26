DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_transformation_event'
      AND conrelid = 'public.event_transformation_applications'::regclass
  ) THEN
    ALTER TABLE public.event_transformation_applications
      ADD CONSTRAINT uq_transformation_event
        UNIQUE (transformation_id, event_id);
  END IF;
END $$;
