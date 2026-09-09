import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import Landing from "@/components/flow/Landing";
import OccupationPicker from "@/components/flow/OccupationPicker";
import TaskSheet from "@/components/flow/TaskSheet";
import PurposePicker from "@/components/flow/PurposePicker";
import ExitIntentSheet from "@/components/flow/ExitIntentSheet";
import ResultReport from "@/components/ResultReport";
import ShareSheet from "@/components/ShareSheet";
import PairInvite from "@/components/PairInvite";
import TypeChallenge from "@/components/TypeChallenge";
import SubscribeOptions from "@/components/SubscribeOptions";
import { toast } from "@/hooks/use-toast";
import { diagnose, toPublicSummary } from "@/lib/diagnosis-engine";
import { acceptPairing, reportOccupationMiss, saveDiagnosis } from "@/lib/diagnosis-store";
import type { DiagnosisResult, TaskEntry, Track } from "@/lib/diagnosis-types";
import {
  trackAbandon,
  trackClick,
  trackComplete,
  trackScreenEnter,
  trackScreenExit,
  type Screen,
} from "@/lib/analytics";

/**
 * 단일 페이지 진단 흐름 — 화면정의 4장
 *
 *   S0 랜딩 → S1 직종 → S2+S3 업무·시간 → S4 목적 → S6 결과 → S7/S8/S9
 *
 * 구조 결정
 *  · **D1** S5(계산 중)를 두지 않는다. 경쟁사는 즉시 갱신을 강점으로 내세우고,
 *    인위적 지연은 검증 안 된 통념이며 이탈 지점만 늘린다.
 *  · **D2** S2와 S3는 한 화면이다 (TaskSheet).
 */

type Step = "S0" | "S1" | "S2" | "S4" | "S6";

const SCREEN_OF: Record<Step, Screen> = { S0: "S0", S1: "S1", S2: "S2", S4: "S4", S6: "S6" };
const IDLE_MS = 30_000;
const emailSchema = z.string().trim().email("올바른 이메일 주소를 입력해주세요.").max(255);

export default function Index() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [step, setStep] = useState<Step>("S0");
  const [occupationId, setOccupationId] = useState<string>("");
  const [entries, setEntries] = useState<TaskEntry[]>([]);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [diagnosisId, setDiagnosisId] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [exitSheet, setExitSheet] = useState(false);
  const exitShown = useRef(false);

  // 궁합 초대를 타고 들어온 경우 (S8b). 결과 뒤에 이메일을 받아 수락으로 잇는다.
  const pendingPairing = params.get("pair");
  const [pairEmail, setPairEmail] = useState("");
  const [pairBusy, setPairBusy] = useState(false);

  const screen = SCREEN_OF[step];

  useEffect(() => {
    trackScreenEnter(screen, { diagnosisId });
    return () => {
      trackScreenExit(screen, { diagnosisId });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // 결과에 닿기 전에 탭을 떠난 경우 = 이탈
  useEffect(() => {
    if (step === "S6") return;
    const onHide = () => {
      if (document.visibilityState === "hidden") trackAbandon(screen);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [step, screen]);

  /**
   * E1 — S2(업무·시간)에서 뒤로가기 또는 30초 무동작에 **1회만**.
   * "과하면 역효과"라 exitShown 으로 세션당 한 번을 강제한다.
   */
  useEffect(() => {
    if (step !== "S2" || exitShown.current) return;

    const fire = () => {
      if (exitShown.current) return;
      exitShown.current = true;
      setExitSheet(true);
      trackScreenEnter("E1");
    };

    let timer = window.setTimeout(fire, IDLE_MS);
    const bump = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(fire, IDLE_MS);
    };

    window.history.pushState({ guard: true }, "");
    const onPop = () => fire();

    window.addEventListener("popstate", onPop);
    window.addEventListener("pointerdown", bump);
    window.addEventListener("keydown", bump);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
    };
  }, [step]);

  const goto = (next: Step) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOccupation = (id: string) => {
    setOccupationId(id);
    setEntries([]);
    trackClick("S1", "pick_occupation", { props: { occupation: id } });
    goto("S2");
  };

  /** D1 — 계산 화면 없이 그 자리에서 결과를 만든다 */
  const handleTrack = useCallback(
    async (track: Track) => {
      trackClick("S4", `track_${track.toLowerCase()}`);
      const computed = diagnose({ occupationId, tasks: entries, track });
      setResult(computed);
      goto("S6");

      const id = await saveDiagnosis(computed);
      if (id) {
        setDiagnosisId(id);
        trackComplete("S6", {
          diagnosisId: id,
          props: {
            type_id: computed.type.id,
            task_count: computed.tasks.length,
            track: track.toLowerCase(),
          },
        });
      }
    },
    [occupationId, entries]
  );

  const restart = () => {
    setStep("S0");
    setOccupationId("");
    setEntries([]);
    setResult(null);
    setDiagnosisId(null);
    setShowShare(false);
    exitShown.current = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** S8b — 초대받은 쪽도 이메일을 넣어야 궁합이 성립한다 (이메일 2건) */
  const acceptInvite = async () => {
    const parsed = emailSchema.safeParse(pairEmail);
    if (!parsed.success) {
      toast({ title: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    if (!pendingPairing || !diagnosisId) {
      toast({ title: "결과 저장이 끝난 뒤에 다시 눌러 주세요.", variant: "destructive" });
      return;
    }
    setPairBusy(true);
    trackClick("S8", "accept_invite", { diagnosisId });
    const ok = await acceptPairing(pendingPairing, diagnosisId, parsed.data);
    setPairBusy(false);
    if (!ok) {
      toast({ title: "이미 성립됐거나 만료된 초대입니다.", variant: "destructive" });
      return;
    }
    navigate(`/p/${pendingPairing}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-cream border-b border-rule">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-ink tracking-tight">AI Life Shift</h1>
            <p className="text-[11px] text-faint">직업이 아니라, 당신의 일주일</p>
          </div>
          {step === "S6" && (
            <button onClick={restart} className="text-xs text-quiet hover:text-indigo transition-colors">
              다시 진단
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5">
        {step === "S0" && (
          <Landing
            onStart={() => {
              trackClick("S0", "start");
              goto("S1");
            }}
          />
        )}

        {step === "S1" && (
          <OccupationPicker onSelect={handleOccupation} onMiss={(term) => reportOccupationMiss(term)} />
        )}

        {step === "S2" && (
          <TaskSheet
            occupationId={occupationId}
            entries={entries}
            onChange={setEntries}
            onNext={() => {
              trackClick("S2", "tasks_done", { props: { task_count: entries.length } });
              goto("S4");
            }}
          />
        )}

        {step === "S4" && <PurposePicker onSelect={handleTrack} />}

        {step === "S6" && result && (
          <ResultReport
            result={result}
            onShare={() => setShowShare(true)}
            onInvite={() =>
              document.getElementById("pair-block")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            {/* F2 반박 버튼 */}
            <TypeChallenge result={result} diagnosisId={diagnosisId} onRevise={() => goto("S2")} />

            <div id="pair-block">
              {pendingPairing ? (
                <section className="rule-top pt-8" data-testid="pair-accept">
                  <h3 className="text-lg font-medium text-ink">겹쳐 본 결과 받기</h3>
                  <p className="text-sm text-body mt-2 leading-relaxed">
                    초대한 분과 당신의 업무 지도를 겹쳐서 보여드릴게요. 결과는 두 분 모두에게 메일로
                    보내드립니다.
                  </p>
                  <div className="mt-5 flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={pairEmail}
                      onChange={(e) => setPairEmail(e.target.value)}
                      placeholder="your@email.com"
                      data-testid="accept-email"
                      className="flex-1 h-11 border border-rule bg-transparent px-3 text-sm text-ink placeholder:text-faint focus-visible:outline-none focus-visible:border-[var(--indigo)]"
                    />
                    <button
                      onClick={acceptInvite}
                      disabled={pairBusy}
                      data-testid="accept-submit"
                      className="h-11 px-6 bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
                    >
                      {pairBusy ? "여는 중" : "겹쳐 보기"}
                    </button>
                  </div>
                  <p className="text-xs text-faint leading-relaxed mt-3">
                    수집 항목: 이메일 주소 · 목적: 궁합 결과 발송 · 보관 기간: 수신 거부 시까지 (최대 12개월)
                  </p>
                </section>
              ) : (
                <PairInvite
                  diagnosisId={diagnosisId}
                  onCreated={(pairingId) => navigate(`/p/${pairingId}?owner=1`)}
                />
              )}
            </div>

            {/* S9 — 결과를 전부 본 뒤 하단. 게이트가 아니라 선택이다 */}
            <SubscribeOptions
              typeId={result.type.id}
              occupationId={result.occupationId}
              diagnosisId={diagnosisId}
            />
          </ResultReport>
        )}
      </main>

      {showShare && result && (
        <ShareSheet
          summary={toPublicSummary(result)}
          resultUrl={diagnosisId ? `${window.location.origin}/r/${diagnosisId}` : window.location.origin}
          diagnosisId={diagnosisId}
          onClose={() => setShowShare(false)}
        />
      )}

      {exitSheet && (
        <ExitIntentSheet
          onContinue={() => {
            trackClick("E1", "continue");
            setExitSheet(false);
          }}
          onLeave={() => {
            trackClick("E1", "leave");
            trackAbandon("S2");
            setExitSheet(false);
            restart();
          }}
        />
      )}
    </div>
  );
}
