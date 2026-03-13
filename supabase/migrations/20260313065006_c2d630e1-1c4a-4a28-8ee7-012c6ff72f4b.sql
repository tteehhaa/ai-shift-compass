
CREATE TABLE public.shared_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mbti text NOT NULL,
  result_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert" ON public.shared_results FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can select" ON public.shared_results FOR SELECT TO public USING (true);
