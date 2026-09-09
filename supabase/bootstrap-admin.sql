-- ============================================================================
-- 관리자 계정 부여
--
-- /admin 로그인은 두 가지를 함께 요구한다.
--   1. auth.users 에 있는 실제 계정 (Supabase Auth 가입)
--   2. public.user_roles 에 role='admin' 행
-- 2번이 없으면 로그인은 되지만 즉시 signOut 된다 (AdminLogin.tsx).
--
-- 사용법
--   1) 먼저 대시보드 Authentication > Users > Add user 로 계정을 만든다
--      (또는 앱에서 signUp). 이메일 확인을 켜뒀다면 확인까지 마친다.
--   2) 아래 이메일을 그 계정으로 바꿔 SQL Editor 에서 실행한다.
--
-- 이 파일은 마이그레이션이 아니다. 계정마다 값이 달라 자동 적용하지 않는다.
-- ============================================================================

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'CHANGE_ME@example.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 확인 — 1행이 나와야 한다
SELECT u.email, r.role
FROM public.user_roles r
JOIN auth.users u ON u.id = r.user_id
WHERE r.role = 'admin';
