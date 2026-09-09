-- ============================================================================
-- S9 구독자 — v2 진단(16유형)에 맞춰 컬럼 교체
--
-- mbti / shift_index 는 v1(MBTI + 하루 루틴) 잔재다. PRD §9 "코드에서 버릴 것"에
-- MBTI 축이 들어 있으므로 새 컬럼을 세우고 옛 컬럼은 nullable 로 남겨 둔다
-- (기존 행을 지우지 않기 위해서다).
-- ============================================================================

ALTER TABLE public.email_subscribers
  ADD COLUMN IF NOT EXISTS diagnosis_id  uuid REFERENCES public.diagnoses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS type_id       integer,
  ADD COLUMN IF NOT EXISTS occupation_id text;

COMMENT ON COLUMN public.email_subscribers.type_id       IS '16유형 번호 (유형16.md)';
COMMENT ON COLUMN public.email_subscribers.occupation_id IS '직종 프리셋 id';
COMMENT ON COLUMN public.email_subscribers.mbti          IS 'v1 잔재. v2 진단에서는 채우지 않는다';
