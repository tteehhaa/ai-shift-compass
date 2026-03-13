import { useState } from 'react';
import type { AnalysisResult } from '@/lib/types';
import { REPLACEMENT_COLORS, REPLACEMENT_LABELS, REPLACEMENT_DESCRIPTIONS, TIME_CATEGORY_COLORS, TIME_CATEGORY_LABELS, TIME_CATEGORY_DESCRIPTIONS } from '@/lib/analysis-engine';
import { cn } from '@/lib/utils';
import { TrendingUp, Clock, DollarSign, Heart, Zap, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface ResultDashboardProps {
  result: AnalysisResult;
  mbti: string;
  onShowShare: () => void;
}

export default function ResultDashboard({ result, mbti, onShowShare }: ResultDashboardProps) {
  const [showLegendDetail, setShowLegendDetail] = useState(false);
  const [showTimeLegend, setShowTimeLegend] = useState(false);

  const levelDurations: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    assist: 0,
    human: 0,
  };
  result.activities.forEach((activity) => {
    levelDurations[activity.replacement_level] += activity.original_duration_hr;
  });

  const replacementBarOrder = ['critical', 'high', 'medium', 'low', 'assist', 'human'] as const;
  const graphTotalHr = replacementBarOrder.reduce((sum, level) => sum + levelDurations[level], 0) || 1;

  // Grouped time report items
  const timeGroups = [
    {
      label: '위험 · 잠식',
      items: [
        { key: 'erosion' as const, hr: result.timeReport.erosionHr },
      ],
      color: TIME_CATEGORY_COLORS.erosion,
    },
    {
      label: '혼재',
      items: [
        { key: 'mixed' as const, hr: result.timeReport.mixedHr },
      ],
      color: TIME_CATEGORY_COLORS.mixed,
    },
    {
      label: '증강 · 획득',
      items: [
        { key: 'gain' as const, hr: result.timeReport.gainHr },
        { key: 'augment' as const, hr: result.timeReport.augmentHr },
      ],
      color: TIME_CATEGORY_COLORS.gain,
    },
    {
      label: '인간 고유',
      items: [
        { key: 'human' as const, hr: result.timeReport.humanHr },
      ],
      color: TIME_CATEGORY_COLORS.human,
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Data Source Citation */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/50 border border-border/30">
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          본 지수는 <strong>Anthropic의 AEI(AI Economic Index)</strong>와 <strong>OECD 비인지 역량 지표</strong>, 
          그리고 <strong>Dario Amodei의 10x 가속 영역 연구</strong>를 기반으로 산출되었습니다.
        </p>
      </div>

      {/* Hero: Shift Index */}
      <div className="glass-card rounded-3xl p-8 text-center">
        <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-4">
          종합 AI 시프트 지수
        </p>
        <div className="text-6xl font-bold text-foreground mb-1">
          {result.shiftIndex}<span className="text-2xl text-muted-foreground">%</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          당신의 일상에서 AI로 대체·자동화할 수 있는 비율
        </p>
      </div>

      {/* AI Replacement Spectrum */}
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
                  'flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/50',
                  i !== result.activities.length - 1 && 'border-b border-border/30'
                )}
              >
                <div
                  className="w-1.5 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{act.activity}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {act.category} · {act.original_duration_hr}시간
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color }}>{act.replacement_score}%</p>
                  </div>
                  <span
                    className="text-[10px] font-medium px-2.5 py-1 rounded-full text-white whitespace-nowrap"
                    style={{ backgroundColor: color }}
                  >
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Color Legend */}
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
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[11px] text-muted-foreground">{REPLACEMENT_LABELS[key]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5-Category Time Report — grouped */}
      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            시간 리포트
          </h3>
          <button
            onClick={() => setShowTimeLegend(!showTimeLegend)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Total */}
        <div className="text-center p-3 rounded-2xl bg-secondary/50 mb-4">
          <p className="text-3xl font-bold text-foreground">{result.timeReport.totalHr}시간</p>
          <p className="text-[11px] text-muted-foreground mt-1">총 입력 시간</p>
        </div>

        {/* Rainbow bar — replacement_level 배지와 1:1 동기화 */}
        <div className="flex rounded-full overflow-hidden h-4 mb-4">
          {replacementBarOrder.map((level) => {
            const val = levelDurations[level];
            if (val <= 0) return null;
            return (
              <div
                key={level}
                className="h-full transition-all"
                style={{
                  backgroundColor: REPLACEMENT_COLORS[level],
                  width: `${(val / graphTotalHr) * 100}%`,
                }}
              />
            );
          })}
        </div>

        {/* Grouped categories */}
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
                      <span key={key} className="text-[11px] text-muted-foreground">
                        {TIME_CATEGORY_LABELS[key]} {hr}시간
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Time legend detail */}
        {showTimeLegend && (
          <div className="mt-4 p-4 rounded-xl bg-secondary/30 space-y-2">
            {Object.entries(TIME_CATEGORY_COLORS).map(([key, color]) => (
              <div key={key} className="flex items-start gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: color }} />
                <div>
                  <p className="text-xs font-medium text-foreground">{TIME_CATEGORY_LABELS[key]}</p>
                  <p className="text-[11px] text-muted-foreground">{TIME_CATEGORY_DESCRIPTIONS[key]}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Economic Value */}
      <div className="glass-card rounded-3xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          경제적 가치
        </h3>
        <p className="text-[11px] text-muted-foreground mb-1 leading-relaxed">
          (획득 시간 + 증강 시간) × 10,030원(2025년 최저시급)
        </p>
        <p className="text-[10px] text-muted-foreground/70 mb-4 leading-relaxed">
          ⚡ AI 활용으로 <strong>실제 창출한 생산적 시간 가치</strong>입니다. 잠식 시간은 손실로 별도 표기됩니다.
        </p>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">일간 창출 가치</span>
            <span className="text-lg font-bold" style={{ color: TIME_CATEGORY_COLORS.gain }}>{result.economicValueDaily.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">월간 환산</span>
            <span className="text-base font-semibold text-muted-foreground">{result.economicValueMonthly.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">연간 환산</span>
            <span className="text-base font-semibold" style={{ color: TIME_CATEGORY_COLORS.gain }}>{result.economicValueYearly.toLocaleString()}원</span>
          </div>
          {result.timeReport.erosionHr > 0 && (
            <div className="mt-2 pt-3 border-t border-border/30">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">일간 잠식 손실</span>
                <span className="text-base font-semibold" style={{ color: TIME_CATEGORY_COLORS.erosion }}>
                  -{(result.timeReport.erosionHr * 10030).toLocaleString()}원
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                알고리즘에 빼앗긴 {result.timeReport.erosionHr}시간의 기회비용
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Wellness / Detox */}
      <div className={cn(
        'glass-card rounded-3xl p-6',
        result.needsDetox && 'border-destructive/30'
      )}>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          {result.needsDetox ? <AlertTriangle className="w-4 h-4 text-destructive" /> : <Heart className="w-4 h-4" style={{ color: TIME_CATEGORY_COLORS.human }} />}
          웰니스 조언
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{result.wellnessAdvice}</p>
        {result.needsDetox && (
          <div className="mt-4 p-3 rounded-xl bg-secondary/50 border border-border/50">
            <p className="text-xs font-medium text-foreground">🧘 디지털 디톡스 추천</p>
            <p className="text-xs text-muted-foreground mt-1">
              하루 최소 2시간은 디지털 기기 없이 보내는 것을 권장합니다.
            </p>
          </div>
        )}
      </div>

      {/* Ranking */}
      <div className="glass-card rounded-3xl p-6 text-center">
        <TrendingUp className="w-6 h-6 mx-auto mb-3" style={{ color: TIME_CATEGORY_COLORS.gain }} />
        <p className="text-sm text-muted-foreground">AI 활용 생산성</p>
        <p className="text-2xl font-bold text-foreground mt-1">
          전체 참여자의 상위 <span style={{ color: TIME_CATEGORY_COLORS.gain }}>{result.percentileRank}%</span>
        </p>
      </div>

      {/* MBTI Persona */}
      <div className="glass-card rounded-3xl p-6">
        <div className="text-center mb-4">
          <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">나의 AI 페르소나</p>
          <div className="text-5xl mb-3">{result.personaEmoji}</div>
          <p className="text-xs text-muted-foreground">{mbti === 'UNKNOWN' ? 'MBTI 모름' : mbti}</p>
          <h3 className="text-xl font-bold text-foreground">{result.persona}</h3>
          <p className="text-sm text-muted-foreground mt-1">{result.personaTitle}</p>
        </div>
        <p className="text-sm text-muted-foreground text-center leading-relaxed">{result.personaDescription}</p>
        <div className="mt-5 p-4 rounded-2xl bg-secondary/50 text-center">
          <p className="text-xs text-muted-foreground mb-1">가장 잘 맞는 AI 파트너</p>
          <p className="text-sm font-semibold text-foreground">
            {result.compatibleMBTI}: {result.compatiblePersona}
          </p>
        </div>
      </div>

      {/* Share CTA */}
      <button
        onClick={onShowShare}
        className="w-full rounded-2xl bg-primary text-primary-foreground py-4 font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99]"
      >
        <Zap className="w-4 h-4" />
        결과 공유하기
      </button>
    </div>
  );
}
