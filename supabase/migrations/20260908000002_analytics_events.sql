-- ============================================================================
-- 이벤트 로깅 — 화면정의 ADM "선행 요건" 대응
--
-- 화면정의: "이벤트 로깅 설계가 아직 없음. 화면 진입·이탈·클릭 이벤트를
--            처음부터 심어야 함 — 소급 불가"
--
-- 원칙
--  · 개인 업무명 원문은 절대 넣지 않는다 (PRD 3.6 / S7 프라이버시 규칙)
--  · 익명 세션 단위. 로그인·쿠키 없이 sessionStorage UUID 하나로 묶는다
--  · INSERT 만 공개, 조회는 관리자 전용
-- ============================================================================

CREATE TABLE public.analytics_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL,
  event_name    text NOT NULL,
  screen        text NOT NULL,
  target        text,
  diagnosis_id  uuid REFERENCES public.diagnosis_results(id) ON DELETE SET NULL,
  props         jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),

  -- 화면정의 2장 화면 목록과 1:1
  CONSTRAINT analytics_events_screen_check CHECK (
    screen IN ('S0','S1','S2','S3','S4','S5','S6','S7','S8','S9','E1','ADM')
  ),
  CONSTRAINT analytics_events_event_name_check CHECK (
    event_name IN ('screen_enter','screen_exit','click','complete','abandon')
  ),
  -- 자유 텍스트가 새어 들어오는 것을 스키마 차원에서 막는다
  CONSTRAINT analytics_events_target_len_check CHECK (
    target IS NULL OR length(target) <= 64
  ),
  CONSTRAINT analytics_events_props_size_check CHECK (
    length(props::text) <= 2048
  )
);

CREATE INDEX idx_analytics_events_session   ON public.analytics_events (session_id, occurred_at);
CREATE INDEX idx_analytics_events_screen    ON public.analytics_events (screen, event_name);
CREATE INDEX idx_analytics_events_created   ON public.analytics_events (created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log events"
ON public.analytics_events
FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "Admins can select events"
ON public.analytics_events
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete events"
ON public.analytics_events
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────────────────────
-- 화면별 이탈률 집계 — 화면정의 ADM "운영 지표"
-- 관리자만 실행 가능. 원시 이벤트를 노출하지 않고 집계만 돌려준다.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_screen_funnel()
RETURNS TABLE (
  screen        text,
  entered       bigint,
  exited        bigint,
  drop_off_rate numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  WITH counts AS (
    SELECT e.screen AS s,
           count(*) FILTER (WHERE e.event_name = 'screen_enter') AS n_in,
           count(*) FILTER (WHERE e.event_name = 'abandon')      AS n_out
    FROM public.analytics_events e
    GROUP BY e.screen
  )
  SELECT c.s,
         c.n_in,
         c.n_out,
         CASE WHEN c.n_in = 0 THEN 0
              ELSE round((c.n_out::numeric / c.n_in::numeric) * 100, 1)
         END
  FROM counts c
  ORDER BY c.s;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_screen_funnel() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_screen_funnel() TO authenticated;
