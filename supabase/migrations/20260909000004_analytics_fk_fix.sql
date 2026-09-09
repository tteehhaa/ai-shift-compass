-- ============================================================================
-- 두 가지 실제 결함 수정
--
-- (1) analytics_events.diagnosis_id 가 v1 테이블(diagnosis_results)을 참조한다.
--     v2 진단 id 를 실으면 외래키 위반으로 INSERT 가 통째로 실패하고,
--     로깅은 fire-and-forget 이라 조용히 사라진다.
--     → 화면정의 ADM "소급 불가"인 바로 그 데이터가 안 쌓인다.
--     v1·v2 어느 쪽 id 도 받을 수 있어야 하므로 외래키를 걷어낸다.
--
-- (2) admin_diagnosis_rankings 의 유형별 분포가 count 를 **문자열로** 정렬한다.
--     (x->>'count' 는 text) "9" > "10" 이 되어 순위가 뒤집힌다.
-- ============================================================================

ALTER TABLE public.analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_diagnosis_id_fkey;

COMMENT ON COLUMN public.analytics_events.diagnosis_id IS
  'v1 diagnosis_results 또는 v2 diagnoses 의 id. 어느 쪽도 받기 위해 외래키를 두지 않는다';

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
    'types', (
      SELECT coalesce(jsonb_agg(x), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object('type_id', type_id, 'type_name', type_name, 'count', count(*)) AS x
        FROM public.diagnoses GROUP BY type_id, type_name ORDER BY count(*) DESC
      ) s
    ),
    'occupations', (
      SELECT coalesce(jsonb_agg(x), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object('occupation_id', occupation_id, 'count', count(*)) AS x
        FROM public.diagnoses GROUP BY occupation_id ORDER BY count(*) DESC
      ) s
    ),
    'tasks', (
      SELECT coalesce(jsonb_agg(x), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object('task_id', task_id, 'count', count(*)) AS x
        FROM task_rows GROUP BY task_id ORDER BY count(*) DESC LIMIT 30
      ) s
    ),
    'delegable', (
      SELECT coalesce(jsonb_agg(x), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object('task_id', task_id, 'count', count(*)) AS x
        FROM task_rows WHERE side = 'delegable'
        GROUP BY task_id ORDER BY count(*) DESC LIMIT 30
      ) s
    ),
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
    'misses', (
      SELECT coalesce(jsonb_agg(x), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object('term', term, 'count', count) AS x
        FROM public.occupation_misses ORDER BY count DESC LIMIT 30
      ) s
    ),
    'tracks', (
      SELECT coalesce(jsonb_agg(x), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object('track', track, 'count', count(*)) AS x
        FROM public.diagnoses GROUP BY track
      ) s
    ),
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
