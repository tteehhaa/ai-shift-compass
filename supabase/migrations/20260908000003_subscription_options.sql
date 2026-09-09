-- ============================================================================
-- S9 선택 구독 — 화면정의 S9
--
-- 페이월(결과 앞 이메일 게이트)을 제거하면서, 이메일은 결과를 전부 본 뒤
-- 하단에서 "선택"으로만 받는다. 어떤 항목을 골랐는지 기록이 필요하다.
--
--   F5 "2주 뒤 다시 해보고 얼마나 바뀌었는지 비교해 드릴게요"
--   F6 "이번 주엔 이것만 — 주간 한 줄 받기"
-- ============================================================================

ALTER TABLE public.email_subscribers
  ADD COLUMN IF NOT EXISTS wants_recheck boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wants_weekly  boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.email_subscribers.wants_recheck IS 'F5 2주 뒤 비교 리포트 수신 동의';
COMMENT ON COLUMN public.email_subscribers.wants_weekly  IS 'F6 주간 한 줄 수신 동의';
