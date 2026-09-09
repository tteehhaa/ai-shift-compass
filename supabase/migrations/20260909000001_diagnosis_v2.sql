-- ============================================================================
-- 진단 v2 — PRD §9-5·6·7·9 / 화면정의 S1~S9·ADM
--
-- v1(MBTI + 하루 루틴) 스키마는 남겨 두고 v2 테이블을 따로 세운다.
-- v1 데이터를 옮길 만한 가치가 없기 때문이다(입력 축 자체가 다르다).
--
-- 프라이버시 원칙 (화면정의 S7/S8)
--  · 개인이 입력한 업무명 원문은 저장하지 않는다. 프리셋 id 만 남는다.
--  · 공개 조회(/r/{id}, /p/{id})는 요약(범주명)만 돌려주는 RPC 를 거친다.
--  · 익명 INSERT 정책을 열지 않는다. 쓰기는 전부 SECURITY DEFINER 함수로만.
--    (R1~R3 에서 배운 것: RLS 는 컬럼을 제한하지 못한다)
-- ============================================================================

-- ─────────────────────────────────────────────────────────────
-- 진단 결과
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.diagnoses (
  id                   uuid PRIMARY KEY,
  occupation_id        text NOT NULL,
  track                text NOT NULL CHECK (track IN ('A', 'B')),
  type_id              integer NOT NULL CHECK (type_id BETWEEN 1 AND 16),
  type_name            text NOT NULL,
  exposure_index       integer NOT NULL CHECK (exposure_index BETWEEN 0 AND 100),
  usage_index          integer NOT NULL CHECK (usage_index BETWEEN 0 AND 100),
  total_weekly_hours   numeric(5,1) NOT NULL CHECK (total_weekly_hours >= 0),
  savable_weekly_hours numeric(5,1) NOT NULL CHECK (savable_weekly_hours >= 0),
  -- [{t: taskId, h: hours, u: usage, s: side}] — 프리셋 id 만. 원문 없음
  tasks                jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- PublicSummary — 범주명만. /r/{id} 가 돌려주는 것이 이것이다
  summary              jsonb NOT NULL DEFAULT '{}'::jsonb,
  email                text,
  created_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT diagnoses_tasks_size CHECK (length(tasks::text) <= 4096),
  CONSTRAINT diagnoses_summary_size CHECK (length(summary::text) <= 4096)
);

CREATE INDEX idx_diagnoses_created ON public.diagnoses (created_at DESC);
CREATE INDEX idx_diagnoses_type    ON public.diagnoses (type_id);
CREATE INDEX idx_diagnoses_occ     ON public.diagnoses (occupation_id);

ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;

-- 익명에게는 어떤 직접 권한도 주지 않는다. 아래 함수만 통과한다.
CREATE POLICY "Admins can select diagnoses"
ON public.diagnoses FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────────────────────
-- 궁합 (S8)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.pairings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_diagnosis_id  uuid NOT NULL REFERENCES public.diagnoses(id) ON DELETE CASCADE,
  invitee_diagnosis_id  uuid REFERENCES public.diagnoses(id) ON DELETE SET NULL,
  inviter_email         text NOT NULL,
  invitee_email         text,
  status                text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'complete')),
  -- 대기 UX: 리마인드는 1회가 상한 (화면정의 S8)
  reminded_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  completed_at          timestamptz
);

CREATE INDEX idx_pairings_inviter ON public.pairings (inviter_diagnosis_id);
CREATE INDEX idx_pairings_status  ON public.pairings (status);

ALTER TABLE public.pairings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select pairings"
ON public.pairings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 궁합 결과 메일 발송 대기열.
-- 발송기(ESP)는 아직 연결돼 있지 않다 — 행만 쌓고 status 로 추적한다.
CREATE TABLE public.pairing_emails (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_id  uuid NOT NULL REFERENCES public.pairings(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL CHECK (role IN ('inviter', 'invitee')),
  status      text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz
);

ALTER TABLE public.pairing_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select pairing emails"
ON public.pairing_emails FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────────────────────
-- 직종 미발견 검색어 (화면정의 S1 "미발견 비율을 반드시 계측할 것")
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.occupation_misses (
  term       text PRIMARY KEY,
  count      integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.occupation_misses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select occupation misses"
ON public.occupation_misses FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 쓰기 경로 — 전부 SECURITY DEFINER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.save_diagnosis(
  _id uuid,
  _occupation_id text,
  _track text,
  _type_id integer,
  _type_name text,
  _exposure integer,
  _usage integer,
  _total numeric,
  _savable numeric,
  _tasks jsonb,
  _summary jsonb
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF length(coalesce(_occupation_id, '')) > 40 THEN
    RAISE EXCEPTION 'occupation_id too long';
  END IF;

  INSERT INTO public.diagnoses (
    id, occupation_id, track, type_id, type_name,
    exposure_index, usage_index, total_weekly_hours, savable_weekly_hours,
    tasks, summary
  )
  VALUES (
    _id, _occupation_id, _track, _type_id, _type_name,
    greatest(0, least(100, _exposure)), greatest(0, least(100, _usage)),
    least(_total, 999.9), least(_savable, 999.9),
    coalesce(_tasks, '[]'::jsonb), coalesce(_summary, '{}'::jsonb)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_diagnosis(uuid, text, text, integer, text, integer, integer, numeric, numeric, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_diagnosis(uuid, text, text, integer, text, integer, integer, numeric, numeric, jsonb, jsonb) TO anon, authenticated;

-- /r/{id} — 요약만 돌려준다. tasks(시간·사용 정도)는 나가지 않는다.
CREATE OR REPLACE FUNCTION public.get_public_diagnosis(_id uuid)
RETURNS TABLE (
  id uuid,
  type_id integer,
  type_name text,
  track text,
  summary jsonb,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.type_id, d.type_name, d.track, d.summary, d.created_at
  FROM public.diagnoses d
  WHERE d.id = _id
$$;

REVOKE ALL ON FUNCTION public.get_public_diagnosis(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_diagnosis(uuid) TO anon, authenticated;

-- S9 선택 구독 / S8 필수 이메일이 공통으로 쓰는 첨부기.
-- 이미 채워진 이메일은 덮어쓸 수 없다 (R2 와 같은 방어).
CREATE OR REPLACE FUNCTION public.attach_email_to_diagnosis(_id uuid, _email text)
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

  UPDATE public.diagnoses
     SET email = lower(btrim(_email))
   WHERE id = _id AND email IS NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_email_to_diagnosis(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attach_email_to_diagnosis(uuid, text) TO anon, authenticated;

-- S8a. 궁합 초대 생성. 이메일이 없으면 링크 자체가 만들어지지 않는다 (PRD 3.5)
CREATE OR REPLACE FUNCTION public.create_pairing(_diagnosis_id uuid, _email text)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF _email IS NULL OR _email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'invalid email';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.diagnoses WHERE id = _diagnosis_id) THEN
    RAISE EXCEPTION 'diagnosis not found';
  END IF;

  INSERT INTO public.pairings (inviter_diagnosis_id, inviter_email)
  VALUES (_diagnosis_id, lower(btrim(_email)))
  RETURNING id INTO new_id;

  INSERT INTO public.pairing_emails (pairing_id, email, role)
  VALUES (new_id, lower(btrim(_email)), 'inviter');

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_pairing(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_pairing(uuid, text) TO anon, authenticated;

-- S8b. 초대받은 쪽이 진단을 끝내고 이메일을 넣으면 궁합이 성립한다 (이메일 2건)
CREATE OR REPLACE FUNCTION public.accept_pairing(_pairing_id uuid, _diagnosis_id uuid, _email text)
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

  UPDATE public.pairings
     SET invitee_diagnosis_id = _diagnosis_id,
         invitee_email        = lower(btrim(_email)),
         status               = 'complete',
         completed_at         = now()
   WHERE id = _pairing_id
     AND status = 'waiting'
     AND inviter_diagnosis_id <> _diagnosis_id;

  GET DIAGNOSTICS affected = ROW_COUNT;

  IF affected > 0 THEN
    INSERT INTO public.pairing_emails (pairing_id, email, role)
    VALUES (_pairing_id, lower(btrim(_email)), 'invitee');
  END IF;

  RETURN affected > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_pairing(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_pairing(uuid, uuid, text) TO anon, authenticated;

-- /p/{id} — 두 사람의 **요약만**. 상대 업무 원문·시간은 나가지 않는다.
CREATE OR REPLACE FUNCTION public.get_pairing(_id uuid)
RETURNS TABLE (
  id uuid,
  status text,
  inviter_summary jsonb,
  invitee_summary jsonb,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id,
         p.status,
         di.summary,
         dv.summary,
         p.created_at
  FROM public.pairings p
  JOIN public.diagnoses di ON di.id = p.inviter_diagnosis_id
  LEFT JOIN public.diagnoses dv ON dv.id = p.invitee_diagnosis_id
  WHERE p.id = _id
$$;

REVOKE ALL ON FUNCTION public.get_pairing(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pairing(uuid) TO anon, authenticated;

-- 직종 미발견 검색어 집계
CREATE OR REPLACE FUNCTION public.bump_occupation_miss(_term text)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean text;
BEGIN
  clean := btrim(coalesce(_term, ''));
  IF clean = '' OR length(clean) > 30 THEN
    RETURN;
  END IF;

  INSERT INTO public.occupation_misses (term, count)
  VALUES (clean, 1)
  ON CONFLICT (term) DO UPDATE
    SET count = public.occupation_misses.count + 1,
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.bump_occupation_miss(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_occupation_miss(text) TO anon, authenticated;

-- ============================================================================
-- ADM 순위 지표 — 화면정의 ADM "순위 지표 (요청 사항)"
-- 전부 관리자 전용. 원시 행을 노출하지 않고 집계만 돌려준다.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_diagnosis_rankings()
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

  WITH task_rows AS (
    SELECT d.id,
           t->>'t' AS task_id,
           t->>'u' AS usage,
           t->>'s' AS side
    FROM public.diagnoses d,
         LATERAL jsonb_array_elements(d.tasks) AS t
  )
  SELECT jsonb_build_object(
    -- 1. 유형별 분포 순위
    'types', (
      SELECT coalesce(jsonb_agg(x ORDER BY x->>'count' DESC), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object('type_id', type_id, 'type_name', type_name, 'count', count(*)) AS x
        FROM public.diagnoses GROUP BY type_id, type_name
      ) s
    ),
    -- 2. 직종별 참여 순위
    'occupations', (
      SELECT coalesce(jsonb_agg(x), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object('occupation_id', occupation_id, 'count', count(*)) AS x
        FROM public.diagnoses GROUP BY occupation_id ORDER BY count(*) DESC
      ) s
    ),
    -- 3. 가장 많이 체크된 업무 순위
    'tasks', (
      SELECT coalesce(jsonb_agg(x), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object('task_id', task_id, 'count', count(*)) AS x
        FROM task_rows GROUP BY task_id ORDER BY count(*) DESC LIMIT 30
      ) s
    ),
    -- 4. "맡길 일"로 판정된 업무 순위 — 사람들의 다음 관심사
    'delegable', (
      SELECT coalesce(jsonb_agg(x), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object('task_id', task_id, 'count', count(*)) AS x
        FROM task_rows WHERE side = 'delegable'
        GROUP BY task_id ORDER BY count(*) DESC LIMIT 30
      ) s
    ),
    -- 5. AI 활용도 "안 씀" 비율 상위 업무 — 미충족 수요
    'unused', (
      SELECT coalesce(jsonb_agg(x), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
                 'task_id', task_id,
                 'none_ratio', round((count(*) FILTER (WHERE usage = 'none'))::numeric
                                     / nullif(count(*), 0) * 100, 1),
                 'total', count(*)
               ) AS x
        FROM task_rows
        GROUP BY task_id
        HAVING count(*) >= 3
        ORDER BY (count(*) FILTER (WHERE usage = 'none'))::numeric / nullif(count(*), 0) DESC
        LIMIT 30
      ) s
    ),
    -- 6. 직종 미발견 검색어 순위
    'misses', (
      SELECT coalesce(jsonb_agg(x), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object('term', term, 'count', count) AS x
        FROM public.occupation_misses ORDER BY count DESC LIMIT 30
      ) s
    ),
    -- 운영 지표: A/B 트랙 비율
    'tracks', (
      SELECT coalesce(jsonb_agg(x), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object('track', track, 'count', count(*)) AS x
        FROM public.diagnoses GROUP BY track
      ) s
    ),
    -- 운영 지표: 평균 선택 업무 수 / 평균 주당 시간
    'averages', (
      SELECT jsonb_build_object(
        'total', count(*),
        'avg_tasks', round(avg(jsonb_array_length(tasks)), 2),
        'avg_hours', round(avg(total_weekly_hours), 1),
        'avg_savable', round(avg(savable_weekly_hours), 1),
        'email_rate', round((count(*) FILTER (WHERE email IS NOT NULL))::numeric
                            / nullif(count(*), 0) * 100, 1)
      )
      FROM public.diagnoses
    ),
    -- 궁합 초대 발송 수 → 수락 완주 수 → 전환율
    'pairing', (
      SELECT jsonb_build_object(
        'invited', count(*),
        'accepted', count(*) FILTER (WHERE status = 'complete'),
        'rate', round((count(*) FILTER (WHERE status = 'complete'))::numeric
                      / nullif(count(*), 0) * 100, 1)
      )
      FROM public.pairings
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_diagnosis_rankings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_diagnosis_rankings() TO authenticated;
