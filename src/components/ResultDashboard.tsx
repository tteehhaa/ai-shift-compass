import { useState, useMemo, useEffect } from "react";
import type { AnalysisResult, AnalyzedActivity, RoutineEntry } from "@/lib/types";
import CommunityRanking from "@/components/CommunityRanking";
import AccuracyFeedback from "@/components/AccuracyFeedback";
import SubscribeOptions from "@/components/SubscribeOptions";
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
import { formatHourRange, weeklyMeaning, weeklySavedHours } from "@/lib/estimate";
import { Badge } from "@/components/ui/badge";

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
  { label: "Anthropic AEI", color: "var(--indigo)" },
  { label: "OECD", color: "var(--indigo-soft)" },
  { label: "Dario Amodei", color: "var(--quiet)" },
];

/**
 * PRD 3.6 D4 — "당신만 할 수 있는 일"을 위로, 색으로 강조.
 * "맡겨도 되는 일"은 아래 중립색. 강조가 강점 쪽에 남게 한다.
 */
function splitWorkMap(activities: AnalyzedActivity[]) {
  const yours = activities
    .filter((a) => a.replacement_level === "human" || a.replacement_level === "assist")
    .sort((a, b) => b.original_duration_hr - a.original_duration_hr);
  const delegable = activities
    .filter((a) => a.replacement_level === "critical" || a.replacement_level === "high")
    .sort((a, b) => b.replacement_score - a.replacement_score);
  return { yours, delegable };
}

export default function ResultDashboard({ result, mbti, routines, diagnosisId: externalDiagnosisId, onShowShare }: ResultDashboardProps) {
  const [showLegendDetail, setShowLegendDetail] = useState(false);
  const [showTimeLegend, setShowTimeLegend] = useState(false);
  const [diagnosisId, setDiagnosisId] = useState<string | null>(externalDiagnosisId || null);

  // Sync when externalDiagnosisId arrives asynchronously
  useEffect(() => {
    if (externalDiagnosisId) setDiagnosisId(externalDiagnosisId);
  }, [externalDiagnosisId]);

  // ── #2 카테고리 위험도 ──
  const categoryRisks = useMemo(() => computeCategoryRisks(result.activities), [result.activities]);
  const topRiskCategory = categoryRisks[0];

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

  // D3 — 되찾을 시간은 범위로만 말한다
  const savedWeekly = weeklySavedHours(result);
  const savedRange = formatHourRange(savedWeekly);
  const savedMeaning = weeklyMeaning(savedWeekly);

  // D4 — 업무 지도
  const { yours, delegable } = splitWorkMap(result.activities);

  return (
    <div className="space-y-8 pb-10">
      {/* ══════════════════════════════════════════════
          D5 — 유형 + 숫자를 한 블록으로. 캡처 한 장에 훅이 들어와야 한다.
         ══════════════════════════════════════════════ */}
      <section className="pt-2 pb-8">
        <p className="text-xs tracking-widest uppercase text-faint mb-4">당신의 유형</p>

        <h2 className="font-voice text-3xl sm:text-4xl leading-tight text-ink mb-2">
          {result.persona}
        </h2>
        <p className="text-base text-body leading-relaxed mb-8">{result.personaTitle}</p>

        <p className="text-xs tracking-widest uppercase text-faint mb-2">되찾을 수 있는 시간</p>
        <p className="text-5xl sm:text-6xl font-semibold text-indigo leading-none mb-3">
          {savedRange}
        </p>
        <p className="text-sm text-body mb-1">{savedMeaning}</p>
        <p className="text-xs text-faint">
          공개 지표를 참고해 산출한 추정치입니다. 확정된 수치가 아닙니다.
        </p>

        <button
          onClick={onShowShare}
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-indigo-soft hover:text-indigo transition-colors"
        >
          <Share2 className="w-4 h-4" />
          결과 공유하기
        </button>
      </section>

      {/* ══════════════════════════════════════════════
          D4 — 업무 지도. 강점이 먼저, 색으로. 맡길 일은 아래 무채색.
         ══════════════════════════════════════════════ */}
      <section className="rule-top pt-8" data-testid="work-map-yours">
        <h3 className="text-lg font-medium text-ink mb-1">당신만 할 수 있는 일</h3>
        <p className="text-sm text-faint mb-5">AI에 밀리지 않는 쪽입니다. 여기를 지키세요.</p>

        {yours.length > 0 ? (
          <ul className="space-y-3">
            {yours.map((act, i) => (
              <li key={`yours-${i}`} className="flex items-baseline justify-between gap-4">
                <span className="text-base text-indigo font-medium">{act.activity}</span>
                <span className="text-sm text-faint shrink-0 tabular-nums">
                  {act.original_duration_hr}시간
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-body">
            지금 적어주신 일 중에는 뚜렷하게 잡히는 게 없어요. 업무를 몇 개 더 넣어보시면 달라집니다.
          </p>
        )}
      </section>

      <section className="rule-top pt-8" data-testid="work-map-delegable">
        <h3 className="text-lg font-medium text-quiet mb-1">맡겨도 되는 일</h3>
        <p className="text-sm text-faint mb-5">손 떼도 되는 부분입니다. 급하게 다 바꾸지 않아도 돼요.</p>

        {delegable.length > 0 ? (
          <ul className="space-y-3">
            {delegable.map((act, i) => (
              <li key={`del-${i}`} className="flex items-baseline justify-between gap-4">
                <span className="text-base text-quiet">{act.activity}</span>
                <span className="text-sm text-faint shrink-0 tabular-nums">
                  {act.original_duration_hr}시간
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-body">넘길 만한 게 딱히 없네요. 원래 그런 일을 하고 계신 거예요.</p>
        )}
      </section>

      {/* ── 근거 표기 ── */}
      <section className="rule-top pt-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {SOURCE_BADGES.map((b) => (
            <span key={b.label} className="inline-flex items-center text-xs text-faint">
              <span
                className="w-1 h-1 rounded-full mr-1.5 inline-block"
                style={{ backgroundColor: b.color }}
              />
              {b.label}
            </span>
          ))}
        </div>
        <p className="text-xs text-faint leading-relaxed mt-2">
          Anthropic AI Economic Index, OECD 직업별 AI 노출도 연구를 참고해 산출했습니다.
        </p>
      </section>

      {/* ── AI Replacement Spectrum ── */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-4">AI 대체 가능성 분석</h3>
        <div className="glass-card overflow-hidden">
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
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h3 className="text-base font-semibold text-foreground">AI 대체 위험 카테고리 순위</h3>
          </div>
          {topRiskCategory && (
            <div className="p-4 mb-4 rule-top">
              <p className="text-sm text-foreground leading-relaxed">
                당신의 업무 중 <strong className="text-destructive">'{topRiskCategory.category}'</strong> 카테고리가{" "}
                <strong className="text-destructive">AI 대체 위험 1위</strong>입니다.
                <span className="text-muted-foreground"> (평균 대체율 {topRiskCategory.avgScore}%)</span>
              </p>
            </div>
          )}
          <div className="space-y-2">
            {categoryRisks.map((cat, i) => {
              // D4 — 위험을 색으로 겁주지 않는다. 무채색 → 인디고 한 방향.
              const dangerLevel = cat.avgScore >= 70 ? "var(--quiet)" : cat.avgScore >= 40 ? "var(--indigo-soft)" : "var(--indigo)";
              return (
                <div key={cat.category} className="flex items-center gap-3 px-1 py-3 border-b border-rule">
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
          <div className="glass-card p-4 space-y-3">
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
      <div className="glass-card p-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            시간 리포트
          </h3>
          <button onClick={() => setShowTimeLegend(!showTimeLegend)} className="text-muted-foreground hover:text-foreground transition-colors">
            <Info className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center p-3 mb-4">
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
              <div key={group.label} className="py-3">
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


      {/* ── Economic Value Cards ── */}
      {/* 💰 창출 가치 카드 */}
      <div className="rule-top pt-8">
        <div className="py-2">
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
          <div className="p-4 rule-top mt-4">
            <p className="text-sm text-foreground leading-relaxed">
              🚀 AI 도구를 활용해 하루{" "}
              <strong>{(result.timeReport.gainHr + result.timeReport.augmentHr).toFixed(1)}시간</strong>의 생산성을 확보하고 있습니다.
            </p>
            <span className="text-muted-foreground text-xs mt-1 block">{getAnnualMetaphor(result.economicValueYearly)}</span>
          </div>

          {/* Annual = daily × 260 */}
          <div className="mt-4 py-5 text-center rule-top">
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
        <div className="rule-top pt-8 mt-8">
          <div className="py-2">
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

            <div className="p-4 rule-top mt-0">
              <p className="text-sm text-foreground leading-relaxed">
                ⚠️ 매일 <strong>{result.timeReport.erosionHr}시간</strong>, AI라면 순식간에 끝낼 작업에 매달리고 있습니다.
              </p>
              <span className="text-muted-foreground text-xs mt-1 block">{getErosionMetaphor(result.timeReport.erosionHr)}</span>
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/30 space-y-3">
                  <p className="text-sm font-semibold text-foreground">💡 AI 역제안</p>
                  {result.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 border-b border-rule py-3">
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

            <div className="mt-4 py-5 text-center rule-top">
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
      <div className="glass-card p-8 text-center mt-8">
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
          <div className="mt-5 p-4 rule-top">
            <p className="text-xs font-medium text-foreground">💡 업무 프레임워크 전환</p>
            <p className="text-xs text-muted-foreground mt-1">단순 반복 업무를 줄이고 기획, 전략, 관계 구축 등 인간 고유의 역량에 집중해보세요.</p>
          </div>
        )}
      </div>

      {/* 잠식 없을 때만 독립 역제안 */}
      {result.timeReport.erosionHr <= 0 && result.recommendations && result.recommendations.length > 0 && (
        <div className="glass-card p-6 mt-8">
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
      <div className="glass-card p-8 text-center mt-8">
        <TrendingUp className="w-6 h-6 mx-auto mb-3" style={{ color: TIME_CATEGORY_COLORS.gain }} />
        <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-3">Productivity Rank</p>
        <p className="text-sm text-muted-foreground">AI 활용 생산성</p>
        <p className="text-2xl font-bold text-foreground mt-1">
          전체 참여자의 상위 <CountUp end={result.percentileRank} suffix="%" className="font-bold" />
        </p>
      </div>

      {/* 유형 설명 — 이름과 한 줄은 D5 상단 블록이 이미 가지고 있으므로 반복하지 않는다 */}
      <div className="glass-card p-8 mt-8">
        <p className="text-xs text-faint tracking-widest uppercase mb-3">유형 설명</p>
        <p className="text-sm text-body leading-relaxed">{result.personaDescription}</p>
        <div className="mt-6 p-5 text-center space-y-2 rule-top">
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

      {/* S9. 이메일 — 선택 구독. 결과를 전부 본 뒤 하단에만 둔다 */}
      <div className="mt-8">
        <SubscribeOptions mbti={mbti} shiftIndex={result.shiftIndex} diagnosisId={diagnosisId} />
      </div>

      {/* Share CTA - bottom */}
      <button
        onClick={onShowShare}
        className="w-full border border-indigo text-indigo py-4 font-medium text-sm flex items-center justify-center gap-2 transition-colors hover:bg-indigo hover:text-cream mt-8"
      >
        <Share2 className="w-4 h-4" />
        결과 공유하기
      </button>

    </div>
  );
}
