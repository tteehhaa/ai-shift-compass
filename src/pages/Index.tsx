import { useState, useCallback, useEffect } from "react";
import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import MBTIGrid from "@/components/MBTIGrid";
import RoutineInput from "@/components/RoutineInput";
import AnalysisAnimation from "@/components/AnalysisAnimation";
import ResultDashboard from "@/components/ResultDashboard";
import ShareCards from "@/components/ShareCards";
import { analyzeRoutines } from "@/lib/analysis-engine";
import type { RoutineEntry, AnalysisResult } from "@/lib/types";

const SAMPLE_ROUTINES: RoutineEntry[] = [
  { time: "08:00", activity: "이메일 확인 및 답장", duration: 1, tag: "📧 단순 행정" },
  { time: "09:00", activity: "AI로 리서치 자료 정리", duration: 2, tag: "📚 자기계발" },
  { time: "11:00", activity: "보고서 작성", duration: 1, tag: "📧 단순 행정" },
  { time: "13:00", activity: "점심 식사 및 산책", duration: 1, tag: "🥗 식사/요리" },
  { time: "14:00", activity: "코딩 및 개발 작업", duration: 3, tag: "💻 전문 업무" },
  { time: "17:00", activity: "유튜브 시청", duration: 1, tag: "🎬 미디어 감상" },
];

type Step = "input" | "analyzing" | "emailGate" | "result";

export default function Index() {
  const [step, setStep] = useState<Step>("input");
  const [mbti, setMbti] = useState("");
  const [routines, setRoutines] = useState<RoutineEntry[]>(SAMPLE_ROUTINES);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showShare, setShowShare] = useState(false);

  // ⭐️ 핵심 추가: 이 사람이 '공유 링크'를 타고 온 방문자인지 추적하는 상태
  const [isSharedView, setIsSharedView] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get("data");

    if (dataParam) {
      try {
        const decodedString = decodeURIComponent(atob(dataParam));
        const parsedData = JSON.parse(decodedString);

        if (parsedData && parsedData.result && parsedData.mbti) {
          setResult(parsedData.result);
          setMbti(parsedData.mbti);
          setStep("result");
          setIsSharedView(true); // 공유 링크로 들어왔음을 표시!

          window.history.replaceState({}, "", window.location.pathname);
        }
      } catch (error) {
        console.error("공유된 데이터를 읽는 데 실패했습니다:", error);
      }
    }
  }, []);

  const canAnalyze = mbti && routines.length > 0 && routines.every((r) => r.activity.trim() && r.activity.length <= 40);

  const handleAnalyze = () => {
    setStep("analyzing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAnalysisComplete = useCallback(() => {
    const res = analyzeRoutines(routines, mbti);
    setResult(res);
    setStep("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [routines, mbti]);

  const handleReset = () => {
    setStep("input");
    setResult(null);
    setShowShare(false);
    setIsSharedView(false); // 다시 시작할 때는 공유 상태 해제
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground tracking-tight">AI Life Shift</h1>
            <p className="text-[11px] text-muted-foreground">AI 라이프 시프트 진단</p>
          </div>
          {step === "result" && (
            <button
              onClick={handleReset}
              className={
                isSharedView
                  ? "flex items-center gap-1.5 text-sm font-bold text-primary hover:opacity-80 transition-opacity"
                  : "flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              }
            >
              {isSharedView ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  나도 진단하기
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  다시 진단
                </>
              )}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8">
        {step === "input" && (
          <div className="space-y-10">
            {/* Hero */}
            <div className="text-center space-y-3 pt-4">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">본인의 일상을 입력하세요</h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                AI가 당신의 삶에 얼마나 영향을 끼칠 수 있는지 진단합니다.
              </p>
            </div>

            {/* Routine Input */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3">평범한 나의 일상 (시간대별 활동)</h3>
              <RoutineInput routines={routines} onChange={setRoutines} />
            </section>

            {/* MBTI */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3">MBTI 선택</h3>
              <MBTIGrid selected={mbti} onSelect={setMbti} />
              {mbti && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  선택됨:{" "}
                  <span className="font-semibold text-foreground">{mbti === "UNKNOWN" ? "MBTI 모름" : mbti}</span>
                </p>
              )}
            </section>

            {/* CTA */}
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className="w-full rounded-2xl bg-primary text-primary-foreground py-4 font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              AI 시프트 진단 시작
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === "analyzing" && <AnalysisAnimation onComplete={handleAnalysisComplete} />}

        {step === "emailGate" && result && (
          <EmailGate mbti={mbti} shiftIndex={result.shiftIndex} onContinue={handleEmailGateContinue} />
        )}

        {step === "result" && result && (
          <div className="space-y-8 pb-10">
            <ResultDashboard result={result} mbti={mbti} onShowShare={() => setShowShare(true)} />

            {/* ⭐️ 핵심 추가: 공유 방문자에게만 보이는 거대한 유입 배너 */}
            {isSharedView && (
              <div className="glass-card rounded-3xl p-8 text-center border-2 border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">나의 AI 시프트 지수는 얼마일까?</h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  남의 결과만 보지 말고,
                  <br />내 일상에 숨겨진 AI 레버리지 기회를 확인해보세요!
                </p>
                <button
                  onClick={handleReset}
                  className="w-full rounded-2xl bg-primary text-primary-foreground py-4 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/25 transition-all hover:opacity-90 active:scale-[0.99]"
                >
                  🚀 지금 바로 1분 만에 진단하기
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {showShare && result && <ShareCards result={result} mbti={mbti} onClose={() => setShowShare(false)} />}
    </div>
  );
}
