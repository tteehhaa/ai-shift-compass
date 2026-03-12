import type { AnalysisResult } from '@/lib/types';
import { REPLACEMENT_COLORS, REPLACEMENT_LABELS } from '@/lib/analysis-engine';
import { cn } from '@/lib/utils';
import { TrendingUp, Clock, DollarSign, Heart, Zap, AlertTriangle } from 'lucide-react';

interface ResultDashboardProps {
  result: AnalysisResult;
  mbti: string;
  onShowShare: () => void;
}

export default function ResultDashboard({ result, mbti, onShowShare }: ResultDashboardProps) {
  return (
    <div className="space-y-8 pb-10">
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
                {/* Color bar indicator */}
                <div
                  className="w-1.5 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />

                {/* Activity info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{act.activity}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {act.category} · {act.original_duration_min}분
                  </p>
                </div>

                {/* Replacement score */}
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
      <div className="flex flex-wrap gap-3 justify-center">
        {Object.entries(REPLACEMENT_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[11px] text-muted-foreground">{REPLACEMENT_LABELS[key]}</span>
          </div>
        ))}
      </div>

      {/* Time Summary */}
      <div className="glass-card rounded-3xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          시간 리포트
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-2xl bg-secondary/50">
            <p className="text-2xl font-bold text-diagnostic-gain">{result.totalGainMin}분</p>
            <p className="text-[11px] text-muted-foreground mt-1">획득 시간</p>
          </div>
          <div className="text-center p-3 rounded-2xl bg-secondary/50">
            <p className="text-2xl font-bold text-diagnostic-erosion">{result.totalErosionMin}분</p>
            <p className="text-[11px] text-muted-foreground mt-1">잠식 시간</p>
          </div>
          <div className="text-center p-3 rounded-2xl bg-secondary/50">
            <p className="text-2xl font-bold text-foreground">{result.totalOriginalMin}분</p>
            <p className="text-[11px] text-muted-foreground mt-1">총 분석 시간</p>
          </div>
          <div className="text-center p-3 rounded-2xl bg-secondary/50">
            <p className="text-2xl font-bold text-diagnostic-human">{result.humanTimeMin}분</p>
            <p className="text-[11px] text-muted-foreground mt-1">인간 고유 시간</p>
          </div>
        </div>
      </div>

      {/* Economic Value */}
      <div className="glass-card rounded-3xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          경제적 가치
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">오늘 번 시간의 가치</span>
            <span className="text-lg font-bold text-foreground">{result.economicValueDaily.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">월간 환산</span>
            <span className="text-base font-semibold text-muted-foreground">{result.economicValueMonthly.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">연간 환산 수익률</span>
            <span className="text-base font-semibold text-diagnostic-gain">{result.economicValueYearly.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      {/* Wellness / Detox */}
      <div className={cn(
        'glass-card rounded-3xl p-6',
        result.needsDetox && 'border-diagnostic-erosion/30 bg-[hsl(var(--diagnostic-erosion)/0.05)]'
      )}>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          {result.needsDetox ? <AlertTriangle className="w-4 h-4 text-diagnostic-erosion" /> : <Heart className="w-4 h-4 text-diagnostic-human" />}
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
        <TrendingUp className="w-6 h-6 mx-auto mb-3 text-diagnostic-gain" />
        <p className="text-sm text-muted-foreground">AI 활용 생산성</p>
        <p className="text-2xl font-bold text-foreground mt-1">
          전체 참여자의 상위 <span className="text-diagnostic-gain">{result.percentileRank}%</span>
        </p>
      </div>

      {/* MBTI Persona (fun section at end) */}
      <div className="glass-card rounded-3xl p-6">
        <div className="text-center mb-4">
          <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">나의 AI 페르소나</p>
          <div className="text-5xl mb-3">{result.personaEmoji}</div>
          <p className="text-xs text-muted-foreground">{mbti}</p>
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
