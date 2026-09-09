-- ============================================================================
-- F2 반박 버튼 — PRD 3.7 "이거 안 맞는데요"
--
-- 기존 accuracy_feedback 은 v1 테이블(diagnosis_results)을 참조한다.
-- v2 진단에는 쓸 수 없어 별도 테이블을 세운다.
--
-- 이 데이터가 성공 지표 "정확도 — 내 일주일이 맞다 70%" 의 재료다.
-- ============================================================================

CREATE TABLE public.challenge_feedback (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id uuid REFERENCES public.diagnoses(id) ON DELETE CASCADE,
  type_id      integer CHECK (type_id BETWEEN 1 AND 16),
  reason       text NOT NULL CHECK (reason IN ('tasks', 'hours', 'usage', 'name')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_challenge_reason ON public.challenge_feedback (reason);

ALTER TABLE public.challenge_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select challenge feedback"
ON public.challenge_feedback FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.record_challenge(
  _diagnosis_id uuid,
  _type_id integer,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _reason NOT IN ('tasks', 'hours', 'usage', 'name') THEN
    RAISE EXCEPTION 'invalid reason';
  END IF;

  INSERT INTO public.challenge_feedback (diagnosis_id, type_id, reason)
  VALUES (_diagnosis_id, _type_id, _reason);
END;
$$;

REVOKE ALL ON FUNCTION public.record_challenge(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_challenge(uuid, integer, text) TO anon, authenticated;

-- 어떤 축이 자주 틀리는가 — 계산 로직 재조정 신호
CREATE OR REPLACE FUNCTION public.admin_challenge_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM public.challenge_feedback),
    'diagnoses', (SELECT count(*) FROM public.diagnoses),
    'by_reason', (
      SELECT coalesce(jsonb_agg(x), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object('reason', reason, 'count', count(*)) AS x
        FROM public.challenge_feedback GROUP BY reason ORDER BY count(*) DESC
      ) s
    ),
    'by_type', (
      SELECT coalesce(jsonb_agg(x), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object('type_id', type_id, 'count', count(*)) AS x
        FROM public.challenge_feedback WHERE type_id IS NOT NULL
        GROUP BY type_id ORDER BY count(*) DESC
      ) s
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_challenge_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_challenge_stats() TO authenticated;
