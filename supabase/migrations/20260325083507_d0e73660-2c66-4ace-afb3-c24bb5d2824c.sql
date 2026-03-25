
-- 1. diagnosis_results: 전체 진단 결과 + 루틴 데이터 저장
CREATE TABLE public.diagnosis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  mbti text NOT NULL,
  shift_index integer NOT NULL,
  routines jsonb NOT NULL,
  result_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.diagnosis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert diagnosis" ON public.diagnosis_results FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Admins can select diagnosis" ON public.diagnosis_results FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete diagnosis" ON public.diagnosis_results FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. accuracy_feedback: 진단 정확도 피드백
CREATE TABLE public.accuracy_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id uuid REFERENCES public.diagnosis_results(id) ON DELETE CASCADE,
  accuracy_score integer NOT NULL CHECK (accuracy_score >= 1 AND accuracy_score <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accuracy_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert feedback" ON public.accuracy_feedback FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Admins can select feedback" ON public.accuracy_feedback FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete feedback" ON public.accuracy_feedback FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
