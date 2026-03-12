import type { AnalysisResult } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TrendingUp, Clock, Shield, Zap } from 'lucide-react';

interface ResultDashboardProps {
  result: AnalysisResult;
  mbti: string;
}

const STATUS_CONFIG = {
  erosion: { label: '잠식', colorClass: 'badge-erosion', textClass: 'text-erosion', icon: '🔴' },
  gain: { label: '획득', colorClass: 'badge-gain', textClass: 'text-gain', icon: '🔵' },
  human: { label: '인간 고유', colorClass: 'badge-human', textClass: 'text-human', icon: '🟣' },
  assist: { label: '보조', colorClass: 'badge-assist', textClass: 'text-assist', icon: '🟢' },
};

export default function ResultDashboard({ result, mbti }: ResultDashboardProps) {
  return (
    <div className="space-y-8">
      {/* Shift Index */}
      <div className="glass-card rounded-3xl p-8 text-center">
        <p className="text-sm font-medium text-muted-foreground tracking-wider uppercase mb-2">
          종합 AI 시프트 지수
        </p>
        <div className="relative inline-flex items-center justify-center w-36 h-36 mb-4">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke="hsl(var(--diagnostic-gain))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(result.shiftIndex / 100) * 327} 327`}
              className="transition-all duration-1000"
            />
          </svg>
          <span className="absolute text-4xl font-bold text-foreground">{result.shiftIndex}</span>
        </div>
        <p className="text-xs text-muted-foreground">/ 100</p>
      </div>

      {/* Persona Card */}
      <div className="glass-card rounded-3xl p-6 flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Zap className="w-7 h-7 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">{mbti} · AI 페르소나</p>
          <h3 className="text-lg font-semibold text-foreground mb-1">{result.persona}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{result.personaDescription}</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '총 절약 시간', value: `${result.totalSavedMin}분`, icon: Clock, accent: 'text-gain' },
          { label: '잠식된 시간', value: `${result.totalErosionMin}분`, icon: Shield, accent: 'text-erosion' },
          { label: '획득 시간', value: `${result.totalGainMin}분`, icon: TrendingUp, accent: 'text-gain' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card rounded-2xl p-4 text-center">
            <stat.icon className={cn('w-5 h-5 mx-auto mb-2', stat.accent)} />
            <p className={cn('text-xl font-bold', stat.accent)}>{stat.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Analysis Table */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">시간대별 분석</h3>
        <div className="glass-card rounded-2xl overflow-hidden">
          {result.activities.map((act, i) => {
            const cfg = STATUS_CONFIG[act.status];
            return (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/50',
                  i !== result.activities.length - 1 && 'border-b border-border/50'
                )}
              >
                {/* Left: User input */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">{act.time}</span>
                    <span className="text-xs text-muted-foreground">· {act.original_duration_min}분</span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{act.activity}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{act.category}</p>
                </div>

                {/* Right: Results */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">압축 ×{act.compression_ratio}</p>
                    <p className={cn('text-sm font-semibold', cfg.textClass)}>
                      {act.status === 'erosion' ? '-' : '+'}{act.saved_time_min}분
                    </p>
                  </div>
                  <span className={cn('text-[10px] font-medium px-2 py-1 rounded-full', cfg.colorClass)}>
                    {cfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={cn('w-2.5 h-2.5 rounded-full', cfg.colorClass)} />
            <span className="text-xs text-muted-foreground">{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
