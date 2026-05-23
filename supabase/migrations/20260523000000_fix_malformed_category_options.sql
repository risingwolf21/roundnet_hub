-- Fix challenge rows where category_options was stored as an empty string instead of an empty array.
-- Identified via Sentry issue ROUNDNET-KARLSRUHE-16C: "malformed array literal: ''".
UPDATE public.challenge
SET category_options = '{}'
WHERE id = 'f071c607-96e6-47ec-9d82-7ea13ac0aea9';
