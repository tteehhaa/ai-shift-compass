import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { AnalysisResult } from '@/lib/types';
import { X, Download, Share2, Loader2, Copy, Check } from 'lucide-react';
import { REPLACEMENT_COLORS } from '@/lib/analysis-engine';

const SERVICE_URL = 'ai-shift-compass.lovable.app';

interface ShareCardsProps {
  result: AnalysisResult;
  mbti: string;
  onClose: () => void;
}

// ── Rainbow Bar ──
function RainbowBar({ result, height = 14 }: { result: AnalysisResult; height?: number }) {
  const levelDurations: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, assist: 0, human: 0 };
  result.activities.forEach(a => { levelDurations[a.replacement_level] += a.original_duration_hr; });
  const total = Object.values(levelDurations).reduce((s, v) => s + v, 0) || 1;
  const order = ['critical', 'high', 'medium', 'low', 'assist', 'human'] as const;

  return (
    <div className="flex rounded-full overflow-hidden w-full" style={{ height }}>
      {order.map(level => {
        const val = levelDurations[level];
        if (val <= 0) return null;
        return <div key={level} style={{ backgroundColor: REPLACEMENT_COLORS[level], width: `${(val / total) * 100}%`, height: '100%' }} />;
      })}
    </div>
  );
}

// ── Mini Legend ──
function MiniLegend() {
  const items = [
    { color: REPLACEMENT_COLORS.critical, label: '위험' },
    { color: REPLACEMENT_COLORS.high, label: '잠식' },
    { color: REPLACEMENT_COLORS.medium, label: '부분지원' },
    { color: REPLACEMENT_COLORS.low, label: '보조' },
    { color: REPLACEMENT_COLORS.assist, label: '자동화' },
    { color: REPLACEMENT_COLORS.human, label: '인간고유' },
  ];
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
      {items.map(({ color, label }) => (
        <span key={label} className="flex items-center gap-1 text-[9px] text-gray-500">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

// ── Logo ──
function LogoMark() {
  return (
    <span className="text-xs font-bold tracking-tight">
      <span style={{ color: REPLACEMENT_COLORS.critical }}>A</span>
      <span style={{ color: REPLACEMENT_COLORS.high }}>I</span>
      <span className="mx-0.5" style={{ color: REPLACEMENT_COLORS.medium }}>L</span>
      <span style={{ color: REPLACEMENT_COLORS.low }}>i</span>
      <span style={{ color: REPLACEMENT_COLORS.assist }}>f</span>
      <span style={{ color: REPLACEMENT_COLORS.human }}>e</span>
      <span className="ml-1 text-gray-500">Shift</span>
    </span>
  );
}

// ── Universal Share Card ──
function ShareCard({ result, mbti }: { result: AnalysisResult; mbti: string }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        aspectRatio: '9/16',
        background: 'linear-gradient(160deg, #f8f9fa 0%, #ffffff 40%, #f0f4ff 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '28px 24px',
      }}
    >
      {/* Top */}
      <div className="flex items-center justify-between">
        <LogoMark />
        <span className="text-[10px] text-gray-400 font-medium">AI 시프트 진단</span>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-5">
        <div className="text-center space-y-1">
          <div className="text-5xl mb-2">{result.personaEmoji}</div>
          <p className="text-gray-400 text-[10px] tracking-[0.2em] uppercase">My AI Persona</p>
          <h3 className="text-gray-900 text-lg font-bold">
            {mbti !== 'UNKNOWN' ? `${mbti}: ` : ''}{result.persona}
          </h3>
          <p className="text-gray-400 text-xs">{result.personaTitle}</p>
        </div>

        <div className="w-full space-y-2 px-2">
          <p className="text-gray-400 text-[9px] text-center tracking-wider uppercase">나의 24시간 AI 컬러맵</p>
          <RainbowBar result={result} height={20} />
          <MiniLegend />
        </div>

        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-gray-400 text-[9px]">AI 시프트 지수</p>
            <p className="text-gray-900 text-2xl font-bold">{result.shiftIndex}%</p>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="text-center">
            <p className="text-gray-400 text-[9px]">인간 고유 시간</p>
            <p className="text-2xl font-bold" style={{ color: REPLACEMENT_COLORS.human }}>{result.humanTimePercent}%</p>
          </div>
        </div>

        <div className="w-full px-3 py-2.5 rounded-xl bg-white/80 border border-gray-100">
          <p className="text-[10px] text-gray-500 text-center leading-relaxed">
            💊 {result.wellnessAdvice}
          </p>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="text-center space-y-1">
        <p className="text-xs font-semibold" style={{ color: '#3b82f6' }}>👉 너도 해봐! 나의 AI 시프트 진단</p>
        <p className="text-[8px] text-gray-300">{SERVICE_URL}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════
// Main Share Modal
// ═══════════════════════════════════
export default function ShareCards({ result, mbti, onClose }: ShareCardsProps) {
  const [copied, setCopied] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const getShareText = () => {
    const base = `나의 AI 시프트 지수는 ${result.shiftIndex}%! 나는 ${mbti === 'UNKNOWN' ? '' : mbti + ': '}${result.persona}. ${result.oneLinerSummary}`;
    return `${base}\n\n👉 당신의 AI 페르소나는? https://${SERVICE_URL}`;
  };

  const captureCard = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    setCapturing(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      });
    } finally {
      setCapturing(false);
    }
  };

  const handleDownload = async () => {
    const blob = await captureCard();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-life-shift.png';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    setCapturing(true);
    const blob = await captureCard();
    setCapturing(false);
    if (!blob) return;

    const file = new File([blob], 'ai-life-shift.png', { type: 'image/png' });
    const shareData = { title: 'AI Life Shift 진단 결과', text: getShareText(), files: [file] };

    // Web Share API — lets user pick Instagram, Threads, X, Facebook, KakaoTalk, etc.
    if (navigator.share && navigator.canShare?.(shareData)) {
      try { await navigator.share(shareData); return; } catch { /* user cancelled */ }
    }

    // Fallback: just download the image
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-life-shift.png';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getShareText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl border border-border/50 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card/95 backdrop-blur-sm rounded-t-3xl px-6 pt-5 pb-3 flex items-center justify-between border-b border-border/30 z-10">
          <h3 className="text-base font-semibold text-foreground">결과 공유하기</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6">
          {/* Card Preview */}
          <div ref={cardRef}>
            <ShareCard result={result} mbti={mbti} />
          </div>

          {capturing && (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />공유 이미지를 생성 중입니다...
            </div>
          )}

          {/* Single row of actions */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleShare}
              disabled={capturing}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />{capturing ? '생성 중...' : '공유하기'}
            </button>
            <button
              onClick={handleDownload}
              disabled={capturing}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />저장
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
