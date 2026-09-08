-- ============================================================================
-- PRD 8장 리스크 대응 — RLS 결함 R1~R3 수정
--
-- R1  shared_results  : FOR SELECT USING (true) 로 result_data 전문이 익명 공개
--                       → 목록 조회 차단, id 지정 단건 조회 RPC로 대체
-- R2  diagnosis_results: "Anyone can update diagnosis email" USING (true) 는
--                       RLS가 컬럼을 제한하지 못하므로 익명이 임의 행의 모든
--                       컬럼을 수정 가능 → email 첨부 전용 RPC로 대체
-- R3  activity_rankings: 익명 INSERT/UPDATE 허용으로 순위 조작 가능
--                       → 집계 전용 RPC로 대체 (read-then-update 경합도 제거)
-- ============================================================================

-- ─────────────────────────────────────────────────────────────
-- R1. shared_results — 전체 공개 SELECT 제거
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can select" ON public.shared_results;

-- 관리자는 대시보드에서 목록을 계속 조회해야 한다
CREATE POLICY "Admins can select shared results"
ON public.shared_results
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 공유 링크(/result/{id})는 id를 아는 사람만 단건 조회.
-- 목록 덤프·순회 조회가 불가능해진다.
CREATE OR REPLACE FUNCTION public.get_shared_result(_id uuid)
RETURNS TABLE (
  id uuid,
  mbti text,
  result_data jsonb,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.mbti, s.result_data, s.created_at
  FROM public.shared_results s
  WHERE s.id = _id
$$;

REVOKE ALL ON FUNCTION public.get_shared_result(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_result(uuid) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- R2. diagnosis_results — 익명 전체 UPDATE 제거
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can update diagnosis email" ON public.diagnosis_results;

-- email 컬럼만, 아직 비어 있을 때만 채운다.
-- 이미 채워진 값은 덮어쓸 수 없어 타인 진단의 이메일 교체가 불가능하다.
CREATE OR REPLACE FUNCTION public.attach_diagnosis_email(_id uuid, _email text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected int;
BEGIN
  IF _email IS NULL OR _email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'invalid email';
  END IF;

  UPDATE public.diagnosis_results
     SET email = lower(btrim(_email))
   WHERE id = _id
     AND email IS NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_diagnosis_email(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attach_diagnosis_email(uuid, text) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- R3. activity_rankings — 익명 INSERT/UPDATE 제거
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can insert" ON public.activity_rankings;
DROP POLICY IF EXISTS "Anyone can update" ON public.activity_rankings;

-- 집계는 원자적 upsert 한 번으로. 클라이언트가 count 값을 직접 정하지 못한다.
CREATE OR REPLACE FUNCTION public.bump_activity_ranking(
  _activity_name text,
  _replacement_score integer,
  _replacement_level text,
  _category text
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _activity_name IS NULL OR btrim(_activity_name) = '' THEN
    RETURN;
  END IF;

  IF length(btrim(_activity_name)) > 40 THEN
    RAISE EXCEPTION 'activity_name too long';
  END IF;

  IF _replacement_score IS NULL OR _replacement_score < 0 OR _replacement_score > 100 THEN
    RAISE EXCEPTION 'replacement_score out of range';
  END IF;

  IF _replacement_level IS NULL OR _replacement_level NOT IN
     ('critical', 'high', 'medium', 'low', 'assist', 'human') THEN
    RAISE EXCEPTION 'invalid replacement_level';
  END IF;

  INSERT INTO public.activity_rankings
    (activity_name, replacement_score, replacement_level, category, count)
  VALUES
    (btrim(_activity_name), _replacement_score, _replacement_level, coalesce(_category, '기타'), 1)
  ON CONFLICT (activity_name) DO UPDATE
    SET count = public.activity_rankings.count + 1,
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.bump_activity_ranking(text, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_activity_ranking(text, integer, text, text) TO anon, authenticated;
