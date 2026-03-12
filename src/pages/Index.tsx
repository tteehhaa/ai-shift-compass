import { useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import MBTIGrid from '@/components/MBTIGrid';
import RoutineInput from '@/components/RoutineInput';
import ResultDashboard from '@/components/ResultDashboard';
import { analyzeRoutines } from '@/lib/analysis-engine';
import type { RoutineEntry, AnalysisResult } from '@/lib/types';

const SAMPLE_ROUTINES: RoutineEntry[] = [
  { time: '08:00', activity: '이메일 확인 및 답장', duration: 30 },
  { time: '09:00', activity: 'AI로 리서치 자료 정리', duration: 90 },
  { time: '11:00', activity: '보고서 작성', duration: 60 },
  { time: '13:00', activity: '점심 식사 및 산책', duration: 60 },
  { time: '14:00', activity: '코딩 및 개발 작업', duration: 120 },
  { time: '17:00', activity: '유튜브 시청', duration: 60 },
];

export default function Index() {
  const [step, setStep] = useState<'input' | 'result'>('input');
  const [mbti, setMbti] = useState('');
  const [routines, setRoutines] = useState<RoutineEntry[]>(SAMPLE_ROUTINES);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const canAnalyze = mbti && routines.length > 0 && routines.every(r => r.activity.trim());

  const handleAnalyze = () => {
    const res = analyzeRoutines(routines, mbti);
    setResult(res);
    setStep('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setStep('input');
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground tracking-tight">AI Life Shift</h1>
            <p className="text-[11px] text-muted-foreground">AI 라이프 시프트 진단</p>
          </div>
          {step === 'result' && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              다시 진단
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8">
        {step === 'input' ? (
          <div className="space-y-10">
            {/* Hero */}
            <div className="text-center space-y-3 pt-4">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                어제의 일상을 입력하세요
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                시간대별 활동을 기록하면, AI가 당신의 삶에 미치는 영향을 정밀 분석합니다.
              </p>
            </div>

            {/* MBTI */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3">MBTI 선택</h3>
              <MBTIGrid selected={mbti} onSelect={setMbti} />
              {mbti && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  선택됨: <span className="font-semibold text-foreground">{mbti}</span>
                </p>
              )}
            </section>

            {/* Routine Input */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3">어제의 일상 (시간대별 활동)</h3>
              <RoutineInput routines={routines} onChange={setRoutines} />
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
        ) : result ? (
          <ResultDashboard result={result} mbti={mbti} />
        ) : null}
      </main>
    </div>
  );
}
