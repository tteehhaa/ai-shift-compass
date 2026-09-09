import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OCCUPATIONS, TASKS } from "@/lib/task-matrix";
import { typeById } from "@/lib/shift-types";

/**
 * ADM. 관리자 — 화면정의 ADM
 *
 * 요청된 순위 지표 6종 + 운영 지표를 한 화면에 놓는다.
 * 집계는 전부 관리자 전용 RPC 가 서버에서 계산한다. 원시 행은 내려오지 않는다.
 *
 * v1 의 가중치 최적화 UI 는 걷어냈다 — 그 계수는 삭제된 v1 엔진의 것이다 (PRD §9).
 */

interface Rankings {
  types: Array<{ type_id: number; type_name: string; count: number }>;
  occupations: Array<{ occupation_id: string; count: number }>;
  tasks: Array<{ task_id: string; count: number }>;
  delegable: Array<{ task_id: string; count: number }>;
  unused: Array<{ task_id: string; none_ratio: number; total: number }>;
  misses: Array<{ term: string; count: number }>;
  tracks: Array<{ track: string; count: number }>;
  averages: {
    total: number;
    avg_tasks: number | null;
    avg_hours: number | null;
    avg_savable: number | null;
    email_rate: number | null;
  };
  pairing: { invited: number; accepted: number; rate: number | null };
}

interface FunnelRow {
  screen: string;
  entered: number;
  exited: number;
  drop_off_rate: number;
}

interface ChallengeStats {
  total: number;
  diagnoses: number;
  by_reason: Array<{ reason: string; count: number }>;
  by_type: Array<{ type_id: number; count: number }>;
}

const SCREEN_NAMES: Record<string, string> = {
  S0: "S0 랜딩",
  S1: "S1 직종",
  S2: "S2 업무·시간",
  S4: "S4 목적",
  S6: "S6 결과",
  S7: "S7 공유",
  S8: "S8 궁합",
  S9: "S9 이메일",
  E1: "E1 이탈 방지",
  ADM: "관리자",
};

const REASON_NAMES: Record<string, string> = {
  tasks: "업무 구성이 틀림",
  hours: "시간이 틀림",
  usage: "AI 사용 정도가 틀림",
  name: "유형 이름이 안 맞음",
};

const taskLabel = (id: string) => TASKS[id]?.label ?? id;
const occupationLabel = (id: string) => OCCUPATIONS.find((o) => o.id === id)?.label ?? id;

function Bar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="h-[3px] w-full bg-[var(--rule)] mt-1.5">
      <div className="h-full bg-indigo" style={{ width: `${width}%` }} />
    </div>
  );
}

function RankList({
  title,
  hint,
  rows,
}: {
  title: string;
  hint: string;
  rows: Array<{ label: string; value: number; suffix?: string }>;
}) {
  const max = Math.max(...rows.map((r) => r.value), 0);
  return (
    <section className="rule-top pt-7">
      <h3 className="text-base font-medium text-ink">{title}</h3>
      <p className="text-xs text-faint mt-1">{hint}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-quiet mt-4">아직 데이터가 없습니다.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {rows.slice(0, 12).map((r, i) => (
            <li key={`${r.label}-${i}`}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm text-body">
                  <span className="text-faint mr-2">{i + 1}</span>
                  {r.label}
                </span>
                <span className="text-sm text-indigo flex-shrink-0">
                  {r.value}
                  {r.suffix ?? ""}
                </span>
              </div>
              <Bar value={r.value} max={max} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState<Rankings | null>(null);
  const [funnel, setFunnel] = useState<FunnelRow[]>([]);
  const [challenge, setChallenge] = useState<ChallengeStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/admin");
      return;
    }

    // 클라이언트 가드. 우회하더라도 아래 RPC 들이 DB 단에서 has_role() 을 다시 본다.
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      await supabase.auth.signOut();
      navigate("/admin");
      return;
    }

    const [r, f, c] = await Promise.all([
      supabase.rpc("admin_diagnosis_rankings"),
      supabase.rpc("admin_screen_funnel"),
      supabase.rpc("admin_challenge_stats"),
    ]);

    if (r.error) setError(r.error.message);
    if (r.data) setRankings(r.data as unknown as Rankings);
    if (f.data) setFunnel(f.data as FunnelRow[]);
    if (c.data) setChallenge(c.data as unknown as ChallengeStats);
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/admin");
  };

  const avg = rankings?.averages;
  const trackA = rankings?.tracks.find((t) => t.track === "A")?.count ?? 0;
  const trackB = rankings?.tracks.find((t) => t.track === "B")?.count ?? 0;
  const accuracyRate =
    challenge && challenge.diagnoses > 0
      ? Math.round((1 - challenge.total / challenge.diagnoses) * 1000) / 10
      : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-cream border-b border-rule">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-ink">관리자</h1>
            <p className="text-[11px] text-faint">응답 통계 · 순위</p>
          </div>
          <button onClick={signOut} className="inline-flex items-center gap-1.5 text-xs text-quiet hover:text-ink">
            <LogOut className="w-3.5 h-3.5" />
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 pb-16">
        {loading ? (
          <p className="pt-16 text-sm text-quiet">불러오는 중…</p>
        ) : error ? (
          <p className="pt-16 text-sm text-body">집계를 불러오지 못했습니다: {error}</p>
        ) : (
          <>
            {/* 운영 지표 */}
            <section className="pt-8">
              <h2 className="font-voice text-2xl text-ink">한눈에</h2>
              <dl className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
                {[
                  { k: "진단 수", v: avg?.total ?? 0 },
                  { k: "평균 선택 업무", v: avg?.avg_tasks ?? 0, s: "개" },
                  { k: "평균 주당 시간", v: avg?.avg_hours ?? 0, s: "h" },
                  { k: "평균 절감 추정", v: avg?.avg_savable ?? 0, s: "h" },
                  { k: "이메일 수집률", v: avg?.email_rate ?? 0, s: "%" },
                  { k: "A / B 트랙", v: `${trackA} / ${trackB}` },
                  { k: "궁합 초대", v: rankings?.pairing.invited ?? 0 },
                  { k: "궁합 완주", v: rankings?.pairing.accepted ?? 0 },
                  { k: "초대→완주 전환율", v: rankings?.pairing.rate ?? 0, s: "%" },
                  { k: '"맞다" 추정 비율', v: accuracyRate ?? "—", s: accuracyRate === null ? "" : "%" },
                ].map((m) => (
                  <div key={m.k}>
                    <dt className="text-xs text-faint">{m.k}</dt>
                    <dd className="font-voice text-2xl text-indigo mt-0.5">
                      {m.v}
                      {"s" in m && m.s ? <span className="text-sm ml-0.5">{m.s}</span> : null}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-faint mt-5 leading-relaxed">
                초대→완주 전환율은 궁합의 최우선 지표입니다 (PRD 3.5). 급락하면 초대받은 쪽 이메일을 면제하는
                안으로 되돌립니다.
              </p>
            </section>

            {/* 순위 6종 — 화면정의 ADM */}
            <div className="mt-8 space-y-8">
              <RankList
                title="유형별 분포"
                hint="한쪽 편중이면 계산 로직 재조정 신호"
                rows={(rankings?.types ?? []).map((t) => ({
                  label: `${t.type_name} (${typeById(t.type_id)?.quadrantLabel ?? ""})`,
                  value: t.count,
                }))}
              />
              <RankList
                title="직종별 참여"
                hint="실제로 누가 오는지 · 프리셋 우선순위"
                rows={(rankings?.occupations ?? []).map((o) => ({
                  label: occupationLabel(o.occupation_id),
                  value: o.count,
                }))}
              />
              <RankList
                title="가장 많이 체크된 업무"
                hint="공통 업무 파악"
                rows={(rankings?.tasks ?? []).map((t) => ({ label: taskLabel(t.task_id), value: t.count }))}
              />
              <RankList
                title='"맡길 일"로 판정된 업무'
                hint="사람들의 다음 관심사 — 다들 손 떼고 싶어 하는 것"
                rows={(rankings?.delegable ?? []).map((t) => ({
                  label: taskLabel(t.task_id),
                  value: t.count,
                }))}
              />
              <RankList
                title='AI "안 씀" 비율 상위 업무'
                hint="미충족 수요 · 다음 제품의 힌트 (응답 3건 이상)"
                rows={(rankings?.unused ?? []).map((t) => ({
                  label: `${taskLabel(t.task_id)} (n=${t.total})`,
                  value: t.none_ratio,
                  suffix: "%",
                }))}
              />
              <RankList
                title="직종 미발견 검색어"
                hint="프리셋에 추가할 직종"
                rows={(rankings?.misses ?? []).map((m) => ({ label: m.term, value: m.count }))}
              />
            </div>

            {/* 화면별 이탈률 */}
            <section className="rule-top pt-7 mt-8">
              <h3 className="text-base font-medium text-ink">화면별 이탈률</h3>
              <p className="text-xs text-faint mt-1">특히 S2 → S4 구간을 본다</p>
              {funnel.length === 0 ? (
                <p className="text-sm text-quiet mt-4">아직 데이터가 없습니다.</p>
              ) : (
                <table className="w-full mt-4 text-sm">
                  <thead>
                    <tr className="text-xs text-faint text-left">
                      <th className="font-normal pb-2">화면</th>
                      <th className="font-normal pb-2 text-right">진입</th>
                      <th className="font-normal pb-2 text-right">이탈</th>
                      <th className="font-normal pb-2 text-right">이탈률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {funnel.map((row) => (
                      <tr key={row.screen} className="border-t border-rule">
                        <td className="py-2 text-body">{SCREEN_NAMES[row.screen] ?? row.screen}</td>
                        <td className="py-2 text-right text-body">{row.entered}</td>
                        <td className="py-2 text-right text-body">{row.exited}</td>
                        <td className="py-2 text-right text-indigo">{row.drop_off_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* F2 반박 */}
            <RankList
              title="반박 사유"
              hint='"이거 안 맞는데요" — 어느 축이 자주 틀리는가'
              rows={(challenge?.by_reason ?? []).map((r) => ({
                label: REASON_NAMES[r.reason] ?? r.reason,
                value: r.count,
              }))}
            />

            <p className="rule-top pt-5 mt-8 text-xs text-faint leading-relaxed">
              모든 집계는 관리자 전용 RPC 가 서버에서 계산합니다. 개인이 입력한 업무명 원문은 애초에 저장되지
              않습니다 — 프리셋 id 만 남습니다.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
