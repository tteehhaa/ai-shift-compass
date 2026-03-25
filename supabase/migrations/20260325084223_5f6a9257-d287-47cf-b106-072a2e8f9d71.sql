
-- algorithm_config: 동적 가중치 설정 테이블
CREATE TABLE public.algorithm_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE,
  config_value numeric NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text DEFAULT 'system'
);

ALTER TABLE public.algorithm_config ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능 (프론트에서 분석 시 사용)
CREATE POLICY "Anyone can select config" ON public.algorithm_config FOR SELECT TO public USING (true);
-- Admin만 수정/삭제
CREATE POLICY "Admins can update config" ON public.algorithm_config FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert config" ON public.algorithm_config FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete config" ON public.algorithm_config FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable pg_cron and pg_net for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
