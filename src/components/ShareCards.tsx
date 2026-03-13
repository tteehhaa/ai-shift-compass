import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { AnalysisResult } from '@/lib/types';
import { X, Instagram, Twitter, Facebook, Copy, Check, Download, Share2, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REPLACEMENT_COLORS, TIME_CATEGORY_COLORS } from '@/lib/analysis-engine';

const SERVICE_URL = 'https://ai-shift-compass.lovable.app';

interface ShareCardsProps {
  result: AnalysisResult;
  mbti: string;
  onClose: () => void;
}

type ShareTab = 'instagram' | 'naver' | 'twitter' | 'facebook';

// ── Shared: 24-hour Color Strip ──
function ColorStrip({ result, height = 16 }: { result: AnalysisResult; height?: number }) {
  const total = result.timeReport.totalHr || 1;
  return (
    <div className="flex rounded-full overflow-hidden w-full" style={{ height }}>
      {result.activities.map((act, i) => (
        <div
          key={i}
          style={{
            backgroundColor: REPLACEMENT_COLORS[act.replacement_level],
            width: `${(act.original_duration_hr / total) * 100}%`,
            height: '100%',
          }}
        />
      ))}
    </div>
  );
}

// ── Shared: Danger percentage ──
function getDangerPercent(result: AnalysisResult) {
  const total = result.timeReport.totalHr || 1;
  const dangerHr = result.activities
    .filter(a => a.replacement_level === 'critical' || a.replacement_level === 'high')
    .reduce((s, a) => s + a.original_duration_hr, 0);
  return Math.round((dangerHr / total) * 100);
}

// ── Shared: Logo sparkle ──
function LogoMark({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const s = size === 'md' ? 'text-base' : 'text-xs';
  return (
    <span className={cn(s, 'font-bold tracking-tight')}>
      <span style={{ color: REPLACEMENT_COLORS.critical }}>A</span>
      <span style={{ color: REPLACEMENT_COLORS.high }}>I</span>
      <span className="mx-0.5" style={{ color: REPLACEMENT_COLORS.medium }}>L</span>
      <span style={{ color: REPLACEMENT_COLORS.low }}>i</span>
      <span style={{ color: REPLACEMENT_COLORS.assist }}>f</span>
      <span style={{ color: REPLACEMENT_COLORS.human }}>e</span>
      <span className="ml-1 text-gray-600">Shift</span>
    </span>
  );
}

// ── Shared: CTA footer ──
function CtaFooter({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn('text-center', compact ? 'space-y-0.5' : 'space-y-1')}>
      <p className={cn('font-semibold', compact ? 'text-[10px]' : 'text-xs')} style={{ color: '#3b82f6' }}>
        👉 너도 해봐! 나의 AI 시프트 진단
      </p>
      <p className={cn('text-gray-400 break-all', compact ? 'text-[8px]' : 'text-[9px]')}>
        {SERVICE_URL}
      </p>
    </div>
  );
}

// ── Strip Legend (mini) ──
function StripLegend() {
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

// ═══════════════════════════════════
// Instagram Card (9:16)
// ═══════════════════════════════════
function InstagramCard({ result, mbti }: { result: AnalysisResult; mbti: string }) {
  const danger = getDangerPercent(result);
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        aspectRatio: '9/16',
        background: 'linear-gradient(160deg, #0f0f12 0%, #1a1a2e 50%, #16213e 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '28px 24px',
      }}
    >
      {/* Top: Logo */}
      <div className="flex items-center justify-between">
        <LogoMark size="md" />
        <span className="text-2xl">{result.personaEmoji}</span>
      </div>

      {/* Middle: Persona + Strip + Danger */}
      <div className="space-y-6 flex-1 flex flex-col items-center justify-center">
        <div className="text-center space-y-1">
          <p className="text-white/50 text-[10px] tracking-[0.3em] uppercase">My AI Persona</p>
          <h3 className="text-white text-lg font-bold">
            {result.personaEmoji} {mbti !== 'UNKNOWN' ? `${mbti}: ` : ''}{result.persona}
          </h3>
          <p className="text-white/40 text-xs">{result.personaTitle}</p>
        </div>

        {/* The Strip — hero visual */}
        <div className="w-full space-y-2">
          <p className="text-white/30 text-[9px] text-center tracking-wider uppercase">나의 24시간 AI 컬러맵</p>
          <ColorStrip result={result} height={24} />
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
            {[
              { color: REPLACEMENT_COLORS.critical, label: '위험' },
              { color: REPLACEMENT_COLORS.high, label: '잠식' },
              { color: REPLACEMENT_COLORS.medium, label: '부분지원' },
              { color: REPLACEMENT_COLORS.low, label: '보조' },
              { color: REPLACEMENT_COLORS.assist, label: '자동화' },
              { color: REPLACEMENT_COLORS.human, label: '인간고유' },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1 text-[8px] text-white/40">
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Danger % — center hero number */}
        <div className="text-center">
          <p className="text-white/40 text-[10px] mb-1">AI 대체 위험도</p>
          <div className="relative inline-block">
            <span className="text-5xl font-black" style={{ color: danger >= 50 ? '#ef4444' : danger >= 30 ? '#f97316' : '#eab308' }}>
              {danger}
            </span>
            <span className="text-lg text-white/50 ml-0.5">%</span>
          </div>
        </div>

        {/* Shift Index */}
        <div className="flex items-center justify-center gap-4 text-center">
          <div>
            <p className="text-white/30 text-[9px]">AI 시프트 지수</p>
            <p className="text-white text-xl font-bold">{result.shiftIndex}%</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <p className="text-white/30 text-[9px]">인간 고유 시간</p>
            <p className="text-purple-400 text-xl font-bold">{result.humanTimePercent}%</p>
          </div>
        </div>
      </div>

      {/* Bottom: CTA */}
      <div className="text-center space-y-1.5">
        <p className="text-blue-400 text-xs font-semibold">👉 너도 해봐! 나의 AI 시프트 진단</p>
        <p className="text-white/20 text-[8px]">{SERVICE_URL}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════
// Naver Blog Card
// ═══════════════════════════════════
function NaverBlogCard({ result, mbti }: { result: AnalysisResult; mbti: string }) {
  const danger = getDangerPercent(result);
  const monthlySavedHr = Math.round((result.timeReport.gainHr + result.timeReport.augmentHr) * 22);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-white px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">
            AI를 통해 매월 {monthlySavedHr}시간을 버는 법
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">AI Life Shift 진단 리포트</p>
        </div>
        <LogoMark />
      </div>

      <div className="p-5 space-y-4">
        {/* Persona row */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">{result.personaEmoji}</span>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {mbti !== 'UNKNOWN' ? `${mbti}: ` : ''}{result.persona}
            </p>
            <p className="text-xs text-gray-400">AI 시프트 지수 {result.shiftIndex}%</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[9px] text-gray-400">AI 대체 위험도</p>
            <p className="text-lg font-black" style={{ color: danger >= 50 ? '#ef4444' : '#f97316' }}>{danger}%</p>
          </div>
        </div>

        {/* The Strip */}
        <div className="space-y-1.5">
          <p className="text-[9px] text-gray-400">나의 24시간 AI 컬러맵</p>
          <ColorStrip result={result} height={14} />
          <StripLegend />
        </div>

        {/* Stats */}
        <div className="flex justify-between text-[11px] text-gray-500 bg-gray-50 rounded-lg p-2.5">
          <span>🔵 획득 {result.timeReport.gainHr}h</span>
          <span>🔴 잠식 {result.timeReport.erosionHr}h</span>
          <span>🟢 증강 {result.timeReport.augmentHr}h</span>
          <span>🟣 고유 {result.timeReport.humanHr}h</span>
        </div>

        <p className="text-xs text-gray-500">
          잠재 가치: 연간 {result.economicValueYearly.toLocaleString()}원 상당
        </p>

        <CtaFooter />
      </div>
    </div>
  );
}

// ═══════════════════════════════════
// Twitter / X Card
// ═══════════════════════════════════
function TwitterCard({ result, mbti }: { result: AnalysisResult; mbti: string }) {
  const danger = getDangerPercent(result);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider">X · One-liner</p>
        <LogoMark />
      </div>

      {/* Strip + danger */}
      <div className="space-y-2">
        <ColorStrip result={result} height={12} />
        <div className="flex items-center justify-between">
          <StripLegend />
          <span className="text-xs font-bold" style={{ color: danger >= 50 ? '#ef4444' : '#f97316' }}>
            위험 {danger}%
          </span>
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-xl">
        <p className="text-sm text-gray-800 leading-relaxed">{result.oneLinerSummary}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="text-lg">{result.personaEmoji}</span>
          <span>{mbti !== 'UNKNOWN' ? `${mbti}: ` : ''}{result.persona}</span>
        </div>
      </div>

      <CtaFooter compact />
    </div>
  );
}

// ═══════════════════════════════════
// Facebook Card
// ═══════════════════════════════════
function FacebookCard({ result, mbti }: { result: AnalysisResult; mbti: string }) {
  const danger = getDangerPercent(result);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">Facebook · 유형별 궁합</p>
        <LogoMark />
      </div>

      {/* Strip + danger */}
      <div className="space-y-1.5">
        <ColorStrip result={result} height={12} />
        <div className="text-center">
          <span className="text-xs font-bold" style={{ color: danger >= 50 ? '#ef4444' : '#f97316' }}>
            AI 대체 위험도 {danger}%
          </span>
        </div>
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
        <p className="text-sm text-gray-700">
          나({result.persona})와 가장 잘 맞는 AI 파트너는<br />
          <strong>[{result.compatibleMBTI}: {result.compatiblePersona}]</strong>입니다.
        </p>
        <p className="text-xs text-gray-400">👉 친구를 태그해보세요!</p>
      </div>

      <CtaFooter compact />
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
        backgroundColor: activeTab === 'instagram' ? '#0f0f12' : '#ffffff',
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
    return `${base}\n\n👉 당신의 AI 페르소나는? ${SERVICE_URL}`;
  };

  const handleNativeShare = async () => {
    setCapturing(true);
    const blob = await captureCard();
    setCapturing(false);
    if (!blob) return;

    const file = new File([blob], 'ai-life-shift.png', { type: 'image/png' });
    const shareData = {
      title: 'AI Life Shift 진단 결과',
      text: getShareText(),
      files: [file],
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // user cancelled
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-life-shift.png';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePlatformShare = async (platform: string) => {
    const text = encodeURIComponent(getShareText());
    const url = encodeURIComponent(SERVICE_URL);

    switch (platform) {
      case 'instagram':
        await handleDownload();
        window.open('instagram://story-camera', '_blank');
        break;
      case 'naver':
        window.open(`https://blog.naver.com/openapi/share?url=${url}&title=${text}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank');
        break;
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
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              )}
            >
              {tab.icon}
              {tab.label}
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
              <Loader2 className="w-4 h-4 animate-spin" />
              공유 이미지를 생성 중입니다...
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleNativeShare}
              disabled={capturing}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              {capturing ? '생성 중...' : '공유하기'}
            </button>
            <button
              onClick={handleDownload}
              disabled={capturing}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              저장
            </button>
            <button
              onClick={() => handleCopy(getShareText())}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={() => handlePlatformShare(activeTab)}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {activeTab === 'instagram' && '이미지 저장 후 인스타그램으로 이동'}
            {activeTab === 'naver' && '네이버 블로그에 공유'}
            {activeTab === 'twitter' && 'X(Twitter)에 공유'}
            {activeTab === 'facebook' && 'Facebook에 공유'}
          </button>
        </div>
      </div>
    </div>
  );
}
