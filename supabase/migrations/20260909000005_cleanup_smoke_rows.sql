-- ============================================================================
-- 배포 전 연동 점검(smoke test)으로 들어간 행 정리.
--
-- v2 RPC 경로(save_diagnosis → get_public_diagnosis → create_pairing →
-- record_challenge → bump_occupation_miss)가 실제로 도는지 확인하느라 만든
-- 행들이다. 통계를 오염시키지 않도록 지운다. 삭제는 id·이메일로 못박아
-- 다른 행에 닿지 않는다.
-- ============================================================================

DELETE FROM public.occupation_misses WHERE term = '우주비행사';
DELETE FROM public.pairing_emails    WHERE email = 'smoke@example.com';
DELETE FROM public.pairings          WHERE inviter_email = 'smoke@example.com';
DELETE FROM public.analytics_events  WHERE diagnosis_id = '82f118a1-bd0b-4e0d-b1fa-88d35018927e';
DELETE FROM public.challenge_feedback WHERE diagnosis_id = '82f118a1-bd0b-4e0d-b1fa-88d35018927e';
DELETE FROM public.diagnoses         WHERE id = '82f118a1-bd0b-4e0d-b1fa-88d35018927e';
