
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
--
-- 실제로 스케줄된 잡은 아직 없다(cron.schedule 호출 없음). 새 프로젝트에서는
-- 확장 설치 권한이 없어 실패할 수 있는데, 그 때문에 마이그레이션 전체가
-- 멈추면 안 되므로 실패를 경고로 흘린다. 잡을 실제로 걸 때 다시 확인할 것.
DO $ext$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron 설치 건너뜀: %', SQLERRM;
END
$ext$;

DO $ext$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_net 설치 건너뜀: %', SQLERRM;
END
$ext$;
