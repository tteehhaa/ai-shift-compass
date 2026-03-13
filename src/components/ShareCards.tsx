import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { AnalysisResult } from '@/lib/types';
import { X, Instagram, Twitter, Facebook, Copy, Check, Download, Share2, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REPLACEMENT_COLORS, REPLACEMENT_LABELS } from '@/lib/analysis-engine';

const SERVICE_URL = 'ai-shift-compass.lovable.app';

interface ShareCardsProps {
  result: AnalysisResult;
  mbti: string;
  onClose: () => void;
}

type ShareTab = 'instagram' | 'naver' | 'twitter' | 'facebook';

// ── Rainbow Bar (matches dashboard exactly) ──
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
function MiniLegend({ light = false }: { light?: boolean }) {
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
        <span key={label} className={cn("flex items-center gap-1", light ? "text-[8px] text-gray-400" : "text-[9px] text-gray-500")}>
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

// ═══════════════════════════════════
// Instagram Story Card (9:16) — White/Glass
// ═══════════════════════════════════
function InstagramCard({ result, mbti }: { result: AnalysisResult; mbti: string }) {
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
        {/* Persona — large & attractive */}
        <div className="text-center space-y-1">
          <div className="text-5xl mb-2">{result.personaEmoji}</div>
          <p className="text-gray-400 text-[10px] tracking-[0.2em] uppercase">My AI Persona</p>
          <h3 className="text-gray-900 text-lg font-bold">
            {mbti !== 'UNKNOWN' ? `${mbti}: ` : ''}{result.persona}
          </h3>
          <p className="text-gray-400 text-xs">{result.personaTitle}</p>
        </div>

        {/* Rainbow bar */}
        <div className="w-full space-y-2 px-2">
          <p className="text-gray-400 text-[9px] text-center tracking-wider uppercase">나의 24시간 AI 컬러맵</p>
          <RainbowBar result={result} height={20} />
          <MiniLegend light />
        </div>

        {/* Key metrics */}
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

        {/* Wellness advice */}
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
// Naver Blog Card — White/Glass
// ═══════════════════════════════════
function NaverBlogCard({ result, mbti }: { result: AnalysisResult; mbti: string }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-gray-100">
      <div className="bg-gradient-to-r from-green-50 to-white px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">{result.personaEmoji} {mbti !== 'UNKNOWN' ? `${mbti}: ` : ''}{result.persona}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">AI Life Shift 진단 리포트</p>
        </div>
        <LogoMark />
      </div>
      <div className="p-5 space-y-4">
        <div className="space-y-1.5">
          <p className="text-[9px] text-gray-400">나의 24시간 AI 컬러맵</p>
          <RainbowBar result={result} height={14} />
          <MiniLegend />
        </div>
        <div className="flex items-center justify-center gap-6 py-2">
          <div className="text-center">
            <p className="text-[9px] text-gray-400">AI 시프트 지수</p>
            <p className="text-xl font-bold text-gray-900">{result.shiftIndex}%</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-center">
            <p className="text-[9px] text-gray-400">인간 고유 시간</p>
            <p className="text-xl font-bold" style={{ color: REPLACEMENT_COLORS.human }}>{result.humanTimePercent}%</p>
          </div>
        </div>
        <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
          <p className="text-[10px] text-gray-500 text-center">💊 {result.wellnessAdvice}</p>
        </div>
        <div className="text-center space-y-0.5">
          <p className="text-xs font-semibold" style={{ color: '#3b82f6' }}>👉 너도 해봐! 나의 AI 시프트 진단</p>
          <p className="text-[9px] text-gray-400">{SERVICE_URL}</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════
// Twitter / X Card — White/Glass
// ═══════════════════════════════════
function TwitterCard({ result, mbti }: { result: AnalysisResult; mbti: string }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider">X · One-liner</p>
        <LogoMark />
      </div>
      <div className="space-y-1.5">
        <RainbowBar result={result} height={12} />
        <MiniLegend />
      </div>
      <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
        <p className="text-sm text-gray-800 leading-relaxed">{result.oneLinerSummary}</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="text-lg">{result.personaEmoji}</span>
        <span>{mbti !== 'UNKNOWN' ? `${mbti}: ` : ''}{result.persona}</span>
      </div>
      <div className="text-center space-y-0.5">
        <p className="text-[10px] font-semibold" style={{ color: '#3b82f6' }}>👉 너도 해봐!</p>
        <p className="text-[8px] text-gray-400">{SERVICE_URL}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════
// Facebook Card — White/Glass
// ═══════════════════════════════════
function FacebookCard({ result, mbti }: { result: AnalysisResult; mbti: string }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">Facebook · 유형별 궁합</p>
        <LogoMark />
      </div>
      <div className="space-y-1.5">
        <RainbowBar result={result} height={12} />
        <MiniLegend />
      </div>
      <div className="text-center space-y-3 py-2">
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <div className="text-4xl">{result.personaEmoji}</div>
            <p className="text-xs font-medium text-gray-800 mt-1">{result.persona}</p>
            <p className="text-[10px] text-gray-400">{mbti !== 'UNKNOWN' ? mbti : 'MBTI 모름'}</p>
          </div>
          <span className="text-2xl">💕</span>
          <div className="text-center">
            <div className="text-4xl">✨</div>
            <p className="text-xs font-medium text-gray-800 mt-1">{result.compatiblePersona}</p>
            <p className="text-[10px] text-gray-400">{result.compatibleMBTI}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400">👉 친구를 태그해보세요!</p>
      </div>
      <div className="text-center space-y-0.5">
        <p className="text-[10px] font-semibold" style={{ color: '#3b82f6' }}>👉 너도 해봐!</p>
        <p className="text-[8px] text-gray-400">{SERVICE_URL}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════
// Main Share Modal
// ═══════════════════════════════════
export default function ShareCards({ result, mbti, onClose }: ShareCardsProps) {
  const [activeTab, setActiveTab] = useState<ShareTab>('instagram');
  const [copied, setCopied] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    a.download = `ai-life-shift-${activeTab}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getShareText = () => {
    const base = activeTab === 'twitter'
      ? result.oneLinerSummary
      : `나의 AI 시프트 지수는 ${result.shiftIndex}%! 나는 ${mbti === 'UNKNOWN' ? '' : mbti + ': '}${result.persona}. ${result.oneLinerSummary}`;
    return `${base}\n\n👉 당신의 AI 페르소나는? https://${SERVICE_URL}`;
  };

  const handleNativeShare = async () => {
    setCapturing(true);
    const blob = await captureCard();
    setCapturing(false);
    if (!blob) return;

    const file = new File([blob], 'ai-life-shift.png', { type: 'image/png' });
    const shareData = { title: 'AI Life Shift 진단 결과', text: getShareText(), files: [file] };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try { await navigator.share(shareData); return; } catch { /* cancelled */ }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-life-shift.png';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleInstagramStory = async () => {
    await handleDownload();
    // Try opening Instagram; falls back to download
    try { window.open('instagram://story-camera', '_blank'); } catch { /* no-op */ }
  };

  const handleInstagramFeed = async () => {
    await handleDownload();
    try { window.open('instagram://library', '_blank'); } catch { /* no-op */ }
  };

  const handlePlatformShare = async (platform: string) => {
    const text = encodeURIComponent(getShareText());
    const url = encodeURIComponent(`https://${SERVICE_URL}`);
    switch (platform) {
      case 'instagram': await handleInstagramStory(); break;
      case 'naver': window.open(`https://blog.naver.com/openapi/share?url=${url}&title=${text}`, '_blank'); break;
      case 'twitter': window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank'); break;
      case 'facebook': window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank'); break;
    }
  };

  const tabs: { key: ShareTab; label: string; icon: React.ReactNode }[] = [
    { key: 'instagram', label: 'Instagram', icon: <Instagram className="w-4 h-4" /> },
    { key: 'naver', label: 'Blog', icon: <span className="text-xs font-bold">N</span> },
    { key: 'twitter', label: 'X', icon: <Twitter className="w-4 h-4" /> },
    { key: 'facebook', label: 'Facebook', icon: <Facebook className="w-4 h-4" /> },
  ];

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

        {/* Tab bar */}
        <div className="flex gap-1 px-6 pt-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all',
                activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'
              )}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Card Preview */}
        <div className="p-6">
          <div ref={cardRef}>
            {activeTab === 'instagram' && <InstagramCard result={result} mbti={mbti} />}
            {activeTab === 'naver' && <NaverBlogCard result={result} mbti={mbti} />}
            {activeTab === 'twitter' && <TwitterCard result={result} mbti={mbti} />}
            {activeTab === 'facebook' && <FacebookCard result={result} mbti={mbti} />}
          </div>

          {capturing && (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />공유 이미지를 생성 중입니다...
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex gap-2">
            <button onClick={handleNativeShare} disabled={capturing} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50">
              <Share2 className="w-4 h-4" />{capturing ? '생성 중...' : '공유하기'}
            </button>
            <button onClick={handleDownload} disabled={capturing} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50">
              <Download className="w-4 h-4" />저장
            </button>
            <button onClick={() => handleCopy(getShareText())} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent transition-colors">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Instagram-specific buttons */}
          {activeTab === 'instagram' && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleInstagramStory}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                <Instagram className="w-3.5 h-3.5" />인스타그램 스토리로 공유
              </button>
              <button
                onClick={handleInstagramFeed}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                <Instagram className="w-3.5 h-3.5" />피드로 공유
              </button>
            </div>
          )}

          {activeTab !== 'instagram' && (
            <button
              onClick={() => handlePlatformShare(activeTab)}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {activeTab === 'naver' && '네이버 블로그에 공유'}
              {activeTab === 'twitter' && 'X(Twitter)에 공유'}
              {activeTab === 'facebook' && 'Facebook에 공유'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
