CREATE TABLE public.tournament_costs (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament  text          NOT NULL,
  category    text          NOT NULL,
  description text,
  amount      numeric(10,2) NOT NULL CHECK (amount >= 0),
  date        date          NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own rows only"
  ON public.tournament_costs
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
