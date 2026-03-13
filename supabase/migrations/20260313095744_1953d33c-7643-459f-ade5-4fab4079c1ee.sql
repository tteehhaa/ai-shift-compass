
CREATE TABLE public.activity_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_name text NOT NULL,
  replacement_score integer NOT NULL,
  replacement_level text NOT NULL,
  category text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create unique index on normalized activity name for upsert
CREATE UNIQUE INDEX idx_activity_rankings_name ON public.activity_rankings (activity_name);

ALTER TABLE public.activity_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert" ON public.activity_rankings FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can select" ON public.activity_rankings FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can update" ON public.activity_rankings FOR UPDATE TO public USING (true) WITH CHECK (true);
