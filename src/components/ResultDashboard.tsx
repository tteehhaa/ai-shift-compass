import { useState, useCallback, useMemo } from "react";
import type { AnalysisResult, AnalyzedActivity, RoutineEntry } from "@/lib/types";
import { Lock, Unlock, Loader2, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import CommunityRanking from "@/components/CommunityRanking";
import AccuracyFeedback from "@/components/AccuracyFeedback";
import {
  REPLACEMENT_COLORS,
  REPLACEMENT_LABELS,
  REPLACEMENT_DESCRIPTIONS,
  TIME_CATEGORY_COLORS,
  TIME_CATEGORY_LABELS,
  TIME_CATEGORY_DESCRIPTIONS,
} from "@/lib/analysis-engine";
import { cn } from "@/lib/utils";
import { TrendingUp, Clock, Share2, Info, ChevronDown, ChevronUp, Coffee, AlertTriangle } from "lucide-react";
import CountUp from "@/components/CountUp";
import { Badge } from "@/components/ui/badge";

const emailSchema = z.string().trim().email("올바른 이메일 주소를 입력해주세요.").max(255);

interface ResultDashboardProps {
  result: AnalysisResult;
  mbti: string;
  routines?: RoutineEntry[];
  diagnosisId?: string | null;
  onShowShare: () => void;
}

function getCoffeeCount(value: number) {
  return Math.floor(value / 4700);
}
function getMcdonaldsCount(value: number) {
  return Math.floor(value / 5500);
}

function getAnnualMetaphor(yearly: number): string {
  if (yearly >= 10_000_000) return `1년이면 유럽 여행을 다녀올 수 있는 금액입니다!`;
  if (yearly >= 5_000_000) return `1년이면 중고차 한 대 값에 해당하는 금액입니다!`;
  if (yearly >= 2_000_000) return `1년이면 최신 노트북을 살 수 있는 금액입니다!`;
  return `1년이면 온라인 강의 수십 개를 수강할 수 있는 금액이에요!`;
}

function getErosionMetaphor(erosionHr: number): string {
  if (erosionHr >= 2) return `이 시간이면 AI를 학습해 업무 경쟁력을 2배 이상 높일 수 있습니다.`;
  if (erosionHr >= 1) return `AI가 내 업무를 대체하기 전, 나만의 고유한 역량을 키울 수 있는 귀중한 시간입니다.`;
  return `단순 작업에 매몰되어 발생하는 치명적인 기회비용입니다.`;
}

// ── #2 카테고리별 위험도 계산 ──
interface CategoryRisk {
  category: string;
  avgScore: number;
  totalHr: number;
  count: number;
}

function computeCategoryRisks(activities: AnalyzedActivity[]): CategoryRisk[] {
  const map = new Map<string, { sumScore: number; totalHr: number; count: number }>();
  for (const a of activities) {
    const cat = a.category;
    const prev = map.get(cat) || { sumScore: 0, totalHr: 0, count: 0 };
    prev.sumScore += a.replacement_score;
    prev.totalHr += a.original_duration_hr;
    prev.count += 1;
    map.set(cat, prev);
  }
  const arr: CategoryRisk[] = [];
  for (const [category, v] of map) {
    arr.push({ category, avgScore: Math.round(v.sumScore / v.count), totalHr: v.totalHr, count: v.count });
  }
  arr.sort((a, b) => b.avgScore - a.avgScore);
  return arr;
}

// ── Source badges data ──
const SOURCE_BADGES = [
  { label: "Anthropic AEI", color: "hsl(210, 80%, 50%)" },
  { label: "OECD", color: "hsl(200, 60%, 45%)" },
  { label: "Dario Amodei", color: "hsl(250, 50%, 50%)" },
];

export default function ResultDashboard({ result, mbti, routines, diagnosisId: externalDiagnosisId, onShowShare }: ResultDashboardProps) {
  const [showLegendDetail, setShowLegendDetail] = useState(false);
  const [showTimeLegend, setShowTimeLegend] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [paywallEmail, setPaywallEmail] = useState("");
  const [paywallAgreed, setPaywallAgreed] = useState(false);
  const [diagnosisId, setDiagnosisId] = useState<string | null>(externalDiagnosisId || null);

  // ── #2 카테고리 위험도 ──
  const categoryRisks = useMemo(() => computeCategoryRisks(result.activities), [result.activities]);
  const topRiskCategory = categoryRisks[0];

  // ── #4 Async unlock with duplicate handling ──
  const handleUnlock = useCallback(async () => {
    const parsed = emailSchema.safeParse(paywallEmail);
    if (!parsed.success) {
      toast({ title: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    if (!paywallAgreed) {
      toast({ title: "개인정보 수집 및 이용에 동의해주세요.", variant: "destructive" });
      return;
    }

    const parsedEmail = parsed.data;
    console.log("[Paywall] 잠금 해제 시도", { email: parsedEmail, diagnosisId });

    try {
      // ⭐️ 기존 diagnosis_results 레코드의 email 컬럼을 UPDATE
      if (diagnosisId) {
        await supabase
          .from("diagnosis_results")
          .update({ email: parsedEmail } as any)
          .eq("id", diagnosisId);
        console.log("[Paywall] diagnosis email updated:", diagnosisId);
      }

      // email_subscribers에 저장
      const { error } = await supabase.from("email_subscribers").insert({
        email: parsedEmail,
        mbti: mbti || null,
        shift_index: result.shiftIndex,
      });

      if (error) {
        if (error.code === "23505") {
          setIsUnlocked(true);
          console.log("[Paywall] 중복 이메일 — 즉시 해제");
          toast({ title: "다시 오신 것을 환영합니다! 🎉", description: "리포트가 즉시 해제되었습니다." });
          return;
        }
        throw error;
      }

      // New user — 1.5s simulation
      setIsUnlocking(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsUnlocked(true);
      setIsUnlocking(false);
      console.log("[Paywall] 잠금 해제 완료");
      toast({ title: "상세 리포트가 해제되었습니다! 🎉", description: "전체 분석 결과를 확인하세요." });
    } catch {
      setIsUnlocking(false);
      toast({ title: "잠시 후 다시 시도해주세요.", variant: "destructive" });
    }
  }, [paywallEmail, paywallAgreed, mbti, result.shiftIndex, diagnosisId]);

  const levelDurations: Record<string, number> = {
    critical: 0, high: 0, medium: 0, low: 0, assist: 0, human: 0,
  };
  result.activities.forEach((activity) => {
    levelDurations[activity.replacement_level] += activity.original_duration_hr;
  });

  const replacementBarOrder = ["critical", "high", "medium", "low", "assist", "human"] as const;
  const graphTotalHr = replacementBarOrder.reduce((sum, level) => sum + levelDurations[level], 0) || 1;

  const timeGroups = [
    { label: "위험 · 잠식", items: [{ key: "erosion" as const, hr: result.timeReport.erosionHr }], color: TIME_CATEGORY_COLORS.erosion },
    { label: "혼재", items: [{ key: "mixed" as const, hr: result.timeReport.mixedHr }], color: TIME_CATEGORY_COLORS.mixed },
    { label: "증강 · 획득", items: [{ key: "gain" as const, hr: result.timeReport.gainHr }, { key: "augment" as const, hr: result.timeReport.augmentHr }], color: TIME_CATEGORY_COLORS.gain },
    { label: "인간 고유", items: [{ key: "human" as const, hr: result.timeReport.humanHr }], color: TIME_CATEGORY_COLORS.human },
  ];

  const coffees = getCoffeeCount(result.economicValueDaily);
  const mcdonalds = getMcdonaldsCount(result.economicValueMonthly);
  const erosionDaily = result.erosionCostDaily ?? result.timeReport.erosionHr * 10030;

  const displayMbti = mbti === "UNKNOWN" ? "사용자" : mbti;

  return (
    <div className="space-y-8 pb-10">
      {/* ── #6 Credential Badges (replaces old Info block) ── */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
          {SOURCE_BADGES.map((b) => (
            <Badge
              key={b.label}
              variant="outline"
              className="text-[10px] font-medium px-3 py-1 border-border/50"
            >
              <span className="w-1.5 h-1.5 rounded-full mr-1.5 inline-block" style={{ backgroundColor: b.color }} />
              {b.label}
            </Badge>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
          본 진단은 Anthropic의 AI Economic Index(AEI), OECD 직업별 AI 노출도 연구, Dario Amodei의 AI 영향력 분석 프레임워크를 기반으로 설계되었습니다.
        </p>
      </div>

      {/* ── Hero: Shift Index ── */}
      <div className="glass-card rounded-3xl p-8 text-center">
        <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-4">종합 AI 시프트 지수</p>
        <div className="text-6xl font-bold text-foreground mb-1">
          <CountUp end={result.shiftIndex} suffix="%" className="text-6xl font-bold text-foreground" />
        </div>
        <p className="text-sm text-muted-foreground mt-2">당신의 일상에서 AI로 대체·자동화할 수 있는 비율</p>

        {/* ── #7 Mini share button under hero ── */}
        <button
          onClick={onShowShare}
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          공유하기
        </button>
      </div>

      {/* ── AI Replacement Spectrum ── */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-4">AI 대체 가능성 분석</h3>
        <div className="glass-card rounded-2xl overflow-hidden">
          {result.activities.map((act, i) => {
            const color = REPLACEMENT_COLORS[act.replacement_level];
            const label = REPLACEMENT_LABELS[act.replacement_level];
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/50",
                  i !== result.activities.length - 1 && "border-b border-border/30",
                )}
              >
                <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{act.activity}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{act.category} · {act.original_duration_hr}시간</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="text-sm font-bold" style={{ color }}>{act.replacement_score}%</p>
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full text-white whitespace-nowrap" style={{ backgroundColor: color }}>
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── #2 Category Risk Ranking ── */}
      {categoryRisks.length > 0 && (
        <div className="glass-card rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h3 className="text-base font-semibold text-foreground">AI 대체 위험 카테고리 순위</h3>
          </div>
          {topRiskCategory && (
            <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-4 mb-4">
              <p className="text-sm text-foreground leading-relaxed">
                당신의 업무 중 <strong className="text-destructive">'{topRiskCategory.category}'</strong> 카테고리가{" "}
                <strong className="text-destructive">AI 대체 위험 1위</strong>입니다.
                <span className="text-muted-foreground"> (평균 대체율 {topRiskCategory.avgScore}%)</span>
              </p>
            </div>
          )}
          <div className="space-y-2">
            {categoryRisks.map((cat, i) => {
              const dangerLevel = cat.avgScore >= 70 ? "hsl(0, 70%, 50%)" : cat.avgScore >= 40 ? "hsl(45, 80%, 50%)" : "hsl(150, 50%, 45%)";
              return (
                <div key={cat.category} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/50">
                  <span className="text-sm font-bold text-muted-foreground w-6 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{cat.category}</p>
                    <p className="text-xs text-muted-foreground">{cat.totalHr}시간 · {cat.count}개 활동</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold" style={{ color: dangerLevel }}>{cat.avgScore}%</p>
                    <p className="text-[10px] text-muted-foreground">평균 대체율</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Color Legend ── */}
      <div>
        <button
          onClick={() => setShowLegendDetail(!showLegendDetail)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <Info className="w-4 h-4" />
          <span>범례 상세 설명</span>
          {showLegendDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {showLegendDetail ? (
          <div className="glass-card rounded-2xl p-4 space-y-3">
            {Object.entries(REPLACEMENT_COLORS).map(([key, color]) => (
              <div key={key} className="flex items-start gap-3">
                <span className="w-3 h-3 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: color as string }} />
                <div>
                  <p className="text-xs font-semibold text-foreground">{REPLACEMENT_LABELS[key]}</p>
                  <p className="text-[11px] text-muted-foreground">{REPLACEMENT_DESCRIPTIONS[key]}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 justify-center">
            {Object.entries(REPLACEMENT_COLORS).map(([key, color]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color as string }} />
                <span className="text-[11px] text-muted-foreground">{REPLACEMENT_LABELS[key]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 5-Category Time Report ── */}
      <div className="glass-card rounded-3xl p-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            시간 리포트
          </h3>
          <button onClick={() => setShowTimeLegend(!showTimeLegend)} className="text-muted-foreground hover:text-foreground transition-colors">
            <Info className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center p-3 rounded-2xl bg-secondary/50 mb-4">
          <p className="text-3xl font-bold text-foreground">{result.timeReport.totalHr}시간</p>
          <p className="text-[11px] text-muted-foreground mt-1">총 입력 시간</p>
        </div>
        <div className="flex rounded-full overflow-hidden h-4 mb-4">
          {replacementBarOrder.map((level) => {
            const val = levelDurations[level];
            if (val <= 0) return null;
            return (
              <div key={level} className="h-full transition-all" style={{ backgroundColor: REPLACEMENT_COLORS[level], width: `${(val / graphTotalHr) * 100}%` }} />
            );
          })}
        </div>
        <div className="space-y-3">
          {timeGroups.map((group) => {
            const groupTotal = group.items.reduce((s, i) => s + i.hr, 0);
            if (groupTotal <= 0) return null;
            return (
              <div key={group.label} className="p-3 rounded-2xl bg-secondary/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                    <span className="text-xs font-semibold text-foreground">{group.label}</span>
                  </div>
                  <span className="text-lg font-bold" style={{ color: group.color }}>{groupTotal}시간</span>
                </div>
                {group.items.length > 1 && (
                  <div className="flex gap-4 mt-1.5 ml-5">
                    {group.items.map(({ key, hr }) => (
                      <span key={key} className="text-[11px] text-muted-foreground">{TIME_CATEGORY_LABELS[key]} {hr}시간</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {showTimeLegend && (
          <div className="mt-4 p-4 rounded-xl bg-secondary/30 space-y-2">
            {Object.entries(TIME_CATEGORY_COLORS).map(([key, color]) => (
              <div key={key} className="flex items-start gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: color as string }} />
                <div>
                  <p className="text-xs font-medium text-foreground">{TIME_CATEGORY_LABELS[key as keyof typeof TIME_CATEGORY_LABELS]}</p>
                  <p className="text-[11px] text-muted-foreground">{TIME_CATEGORY_DESCRIPTIONS[key as keyof typeof TIME_CATEGORY_DESCRIPTIONS]}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          PAYWALL GATE — 3페이지 진입 전 잠금 화면
         ══════════════════════════════════════════════ */}
      {!isUnlocked && (
        <div className="relative">
          <div className="rounded-3xl border-2 border-blue-200 bg-white p-8 shadow-lg relative z-10">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 mb-5">
                <Lock className="w-7 h-7 text-blue-500" />
              </div>

              {/* ── #3 심리적 유도: MBTI + 상위 % ── */}
              <p className="text-sm font-semibold text-blue-600 mb-3">
                상위 {result.percentileRank}%의 AI 활용 능력을 가진 {displayMbti}님
              </p>

              <h3 className="text-lg font-bold text-foreground mb-2">
                상세 분석 리포트가 완성되었습니다.
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                지금 바로 확인하세요.
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                <strong className="text-blue-600">베타 기간 한정 0원</strong>{" "}
                <span className="line-through">(정가 9,900원)</span>
              </p>
            </div>

            {/* Email Input */}
            <div className="space-y-3">
              <input
                type="email"
                value={paywallEmail}
                onChange={(e) => setPaywallEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && paywallAgreed && handleUnlock()}
                placeholder="your@email.com"
                className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />

              {/* Privacy Consent */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input type="checkbox" checked={paywallAgreed} onChange={(e) => setPaywallAgreed(e.target.checked)} className="sr-only" />
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${paywallAgreed ? "bg-primary border-primary" : "border-muted-foreground/30 group-hover:border-muted-foreground/50"}`}>
                    {paywallAgreed && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground leading-relaxed text-left">
                  <strong className="text-foreground">[필수]</strong> 개인정보 수집 및 이용 동의 (업데이트 안내 및 관련 정보 수신)
                  <br />
                  <span className="text-[10px]">수집항목: 이메일 주소 · 목적: 리포트 발송 및 서비스 업데이트 · 보유기간: 동의 철회 시까지</span>
                </span>
              </label>

              <button
                onClick={handleUnlock}
                disabled={isUnlocking || !paywallEmail}
                className="w-full rounded-2xl bg-blue-600 text-white py-4 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUnlocking ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <Unlock className="w-5 h-5" />
                    상세 결과 확인하기
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-muted-foreground/60">
              <Shield className="w-3 h-3" />
              <span>실제 결제는 발생하지 않으며, 버튼 클릭 시 즉시 열람할 수 있습니다.</span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          LOCKED CONTENT (Pages 3~5) — Blur when locked
         ══════════════════════════════════════════════ */}
      <div className={!isUnlocked ? "blur-md select-none pointer-events-none opacity-60" : ""}>

      {/* ── Economic Value Cards ── */}
      {/* 💰 창출 가치 카드 */}
      <div className="rounded-3xl overflow-hidden border-2" style={{ borderColor: "hsl(210 80% 55% / 0.3)" }}>
        <div className="p-6" style={{ background: "linear-gradient(135deg, hsl(210 80% 96%), hsl(150 60% 95%))" }}>
          <div className="flex items-center gap-2 mb-5">
            <span className="text-2xl">💰</span>
            <h3 className="text-base font-bold text-foreground">AI를 레버리지하여 창출한 부가가치</h3>
          </div>

          {/* Daily */}
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-sm text-muted-foreground">오늘 하루</span>
            <span style={{ color: TIME_CATEGORY_COLORS.gain }}>
              <CountUp end={result.economicValueDaily} prefix="+" suffix="원" className="text-2xl font-bold" formatter={(n) => n.toLocaleString()} />
            </span>
          </div>
          {coffees > 0 && (
            <div className="flex items-center gap-1.5 justify-end mb-4">
              <Coffee className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">커피 {coffees}잔 값</span>
            </div>
          )}

          {/* Monthly = daily × 22 */}
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-sm text-muted-foreground">한 달이면</span>
            <CountUp end={result.economicValueMonthly} prefix="+" suffix="원" className="text-xl font-semibold text-foreground" formatter={(n) => n.toLocaleString()} />
          </div>
          {mcdonalds > 0 && (
            <div className="flex items-center gap-1.5 justify-end mb-1">
              <span className="text-lg">🍔</span>
              <span className="text-xs text-muted-foreground">빅맥 {mcdonalds}개</span>
            </div>
          )}

          {/* Insight Box */}
          <div className="rounded-2xl p-4 bg-white/60 border border-blue-200/50 mt-4">
            <p className="text-sm text-foreground leading-relaxed">
              🚀 AI 도구를 활용해 하루{" "}
              <strong>{(result.timeReport.gainHr + result.timeReport.augmentHr).toFixed(1)}시간</strong>의 생산성을 확보하고 있습니다.
            </p>
            <span className="text-muted-foreground text-xs mt-1 block">{getAnnualMetaphor(result.economicValueYearly)}</span>
          </div>

          {/* Annual = daily × 260 */}
          <div className="mt-4 rounded-2xl p-5 text-center" style={{ background: "linear-gradient(135deg, hsl(210 80% 50%), hsl(150 60% 45%))" }}>
            <p className="text-xs text-white/80 mb-1">📈 1년 환산 가치</p>
            <CountUp end={result.economicValueYearly} prefix="+" suffix="원" className="text-3xl font-black text-white" formatter={(n) => n.toLocaleString()} />
          </div>

          <p className="text-[10px] text-muted-foreground/50 mt-3 text-center">
            * 2025년 최저시급 10,030원 기준 · 일 → 월(×22) → 연(×260) 환산
          </p>
        </div>
      </div>

      {/* 🚨 잠식 손실 카드 */}
      {result.timeReport.erosionHr > 0 && (
        <div className="rounded-3xl overflow-hidden border-2 mt-8" style={{ borderColor: "hsl(0 70% 55% / 0.3)" }}>
          <div className="p-6" style={{ background: "linear-gradient(135deg, hsl(0 70% 97%), hsl(30 80% 96%))" }}>
            <div className="flex items-center gap-2 mb-5">
              <span className="text-2xl">🚨</span>
              <h3 className="text-base font-bold text-foreground">AI에 대체될 위기에 처한 당신의 시간</h3>
            </div>

            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm text-muted-foreground">오늘 하루</span>
              <span style={{ color: TIME_CATEGORY_COLORS.erosion }}>
                <CountUp end={erosionDaily} prefix="-" suffix="원" className="text-2xl font-bold" formatter={(n) => n.toLocaleString()} />
              </span>
            </div>
            <div className="flex items-center gap-1.5 justify-end mb-4">
              <span className="text-xs text-muted-foreground">⏱️ {result.timeReport.erosionHr}시간 잠식</span>
            </div>

            <div className="flex items-baseline justify-between mb-4">
              <span className="text-sm text-muted-foreground">한 달이면</span>
              <span style={{ color: TIME_CATEGORY_COLORS.erosion }}>
                <CountUp end={erosionDaily * 22} prefix="-" suffix="원" className="text-xl font-semibold" formatter={(n) => n.toLocaleString()} />
              </span>
            </div>

            <div className="rounded-2xl p-4 bg-white/60 border border-red-200/50 mt-0">
              <p className="text-sm text-foreground leading-relaxed">
                ⚠️ 매일 <strong>{result.timeReport.erosionHr}시간</strong>, AI라면 순식간에 끝낼 작업에 매달리고 있습니다.
              </p>
              <span className="text-muted-foreground text-xs mt-1 block">{getErosionMetaphor(result.timeReport.erosionHr)}</span>
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/30 space-y-3">
                  <p className="text-sm font-semibold text-foreground">💡 AI 역제안</p>
                  {result.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl bg-white/50 border border-border/30 p-3">
                      <span className="text-lg shrink-0">{rec.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{rec.tool}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{rec.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-2xl p-5 text-center" style={{ background: "linear-gradient(135deg, hsl(0 70% 50%), hsl(30 70% 50%))" }}>
              <p className="text-xs text-white/80 mb-1">💸 1년 누적 기회비용</p>
              <CountUp end={erosionDaily * 260} prefix="-" suffix="원" className="text-3xl font-black text-white" formatter={(n) => n.toLocaleString()} />
              <p className="text-xs text-white/80 mt-1">단순 업무에서 벗어나 진짜 경쟁력을 키우세요</p>
            </div>

            <p className="text-[10px] text-muted-foreground/50 mt-3 text-center">
              * 도파민 잠식 활동은 1.2배 가중 적용 · 일 → 월(×22) → 연(×260)
            </p>
          </div>
        </div>
      )}

      {/* 업무 방식 혁신 제안 */}
      <div className="glass-card rounded-3xl p-8 text-center mt-8">
        <div className="text-5xl mb-4">{result.needsDetox ? <span>⚠️</span> : <span>💡</span>}</div>
        <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-3">Work Innovation</p>
        <h3 className="text-xl font-bold text-foreground mb-2">업무 방식 혁신 제안</h3>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            인간 고유 활동 비율{" "}
            <span className="font-bold text-foreground" style={{ color: TIME_CATEGORY_COLORS.human }}>{result.humanTimePercent}%</span>
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">{result.wellnessAdvice}</p>
        </div>
        {result.needsDetox && (
          <div className="mt-5 p-4 rounded-2xl bg-secondary/50 border border-border/50">
            <p className="text-xs font-medium text-foreground">💡 업무 프레임워크 전환</p>
            <p className="text-xs text-muted-foreground mt-1">단순 반복 업무를 줄이고 기획, 전략, 관계 구축 등 인간 고유의 역량에 집중해보세요.</p>
          </div>
        )}
      </div>

      {/* 잠식 없을 때만 독립 역제안 */}
      {result.timeReport.erosionHr <= 0 && result.recommendations && result.recommendations.length > 0 && (
        <div className="glass-card rounded-3xl p-6 mt-8">
          <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1">💡 AI 역제안</p>
          {result.recommendations.map((rec, i) => (
            <div key={i} className="flex items-center gap-2 mb-2 last:mb-0">
              <span className="text-sm shrink-0">{rec.icon}</span>
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">{rec.tool}</strong> — {rec.reason}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Ranking */}
      <div className="glass-card rounded-3xl p-8 text-center mt-8">
        <TrendingUp className="w-6 h-6 mx-auto mb-3" style={{ color: TIME_CATEGORY_COLORS.gain }} />
        <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-3">Productivity Rank</p>
        <p className="text-sm text-muted-foreground">AI 활용 생산성</p>
        <p className="text-2xl font-bold text-foreground mt-1">
          전체 참여자의 상위 <CountUp end={result.percentileRank} suffix="%" className="font-bold" />
        </p>
      </div>

      {/* MBTI Persona */}
      <div className="glass-card rounded-3xl p-8 mt-8">
        <div className="text-center mb-4">
          <p className="text-xs text-muted-foreground tracking-widest uppercase mb-3">나의 AI 페르소나</p>
          <div className="text-5xl mb-3">{result.personaEmoji}</div>
          <p className="text-xs text-muted-foreground">{mbti === "UNKNOWN" ? "MBTI 모름" : mbti}</p>
          <h3 className="text-xl font-bold text-foreground">{result.persona}</h3>
          <p className="text-sm text-muted-foreground mt-1">{result.personaTitle}</p>
        </div>
        <p className="text-sm text-muted-foreground text-center leading-relaxed">{result.personaDescription}</p>
        <div className="mt-6 p-5 rounded-2xl bg-secondary/50 text-center space-y-2">
          <p className="text-xs text-muted-foreground tracking-widest uppercase">Best AI Partner</p>
          <div className="text-3xl">{result.compatibleEmoji}</div>
          <p className="text-sm font-semibold text-foreground">{result.compatibleMBTI}: {result.compatiblePersona}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{result.compatibleReason}</p>
        </div>
      </div>

      {/* Community Ranking */}
      <div className="mt-8">
        <CommunityRanking activities={result.activities} />
      </div>

      {/* Accuracy Feedback */}
      <div className="mt-8">
        <AccuracyFeedback diagnosisId={diagnosisId} />
      </div>

      {/* Share CTA - bottom */}
      <button
        onClick={onShowShare}
        className="w-full rounded-2xl border border-[#E85D22] text-[#E85D22] py-4 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:bg-[#E85D22] hover:text-white active:scale-[0.97] mt-8"
      >
        <Share2 className="w-4 h-4" />
        결과 공유하기
      </button>

      </div>{/* End blur wrapper */}
    </div>
  );
}
