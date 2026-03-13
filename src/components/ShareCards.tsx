import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { AnalysisResult } from '@/lib/types';
import { X, Instagram, Twitter, Facebook, Copy, Check, Download, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REPLACEMENT_COLORS, TIME_CATEGORY_COLORS } from '@/lib/analysis-engine';

interface ShareCardsProps {
  result: AnalysisResult;
  mbti: string;
  onClose: () => void;
}

type ShareTab = 'instagram' | 'naver' | 'twitter' | 'facebook';

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

  const handleNativeShare = async () => {
    const blob = await captureCard();
    if (!blob) return;
    const file = new File([blob], 'ai-life-shift.png', { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: 'AI Life Shift 진단 결과',
          text: result.oneLinerSummary,
          files: [file],
        });
      } catch {
        // user cancelled
      }
    } else {
      handleDownload();
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
              onClick={() => {
                const text = activeTab === 'twitter'
                  ? result.oneLinerSummary
                  : `나의 AI 시프트 지수는 ${result.shiftIndex}%! 나는 ${mbti === 'UNKNOWN' ? '' : mbti + ': '}${result.persona}. ${result.oneLinerSummary}`;
                handleCopy(text);
              }}
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

function InstagramCard({ result, mbti }: { result: AnalysisResult; mbti: string }) {
  return (
    <div className="bg-gradient-to-br from-primary/5 to-accent rounded-2xl p-6 border border-border/30" style={{ aspectRatio: '9/16', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="text-center space-y-5">
        <p className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase font-medium">AI Life Shift</p>
        <div className="text-7xl">{result.personaEmoji}</div>
        <div>
          <h4 className="text-lg font-bold text-foreground">
            나는 AI 시대의 [{mbti === 'UNKNOWN' ? '' : mbti + ': '}{result.persona}]
          </h4>
          <p className="text-sm text-muted-foreground mt-1">{result.personaTitle}</p>
        </div>
        <div className="text-5xl font-bold text-foreground">
          {result.shiftIndex}<span className="text-lg text-muted-foreground">%</span>
        </div>
        {/* Mini spectrum */}
        <div className="flex gap-0.5 justify-center">
          {result.activities.slice(0, 8).map((act, i) => (
            <div
              key={i}
              className="w-6 h-2 rounded-full"
              style={{ backgroundColor: REPLACEMENT_COLORS[act.replacement_level] }}
            />
          ))}
        </div>
        {/* Rainbow time bar */}
        <div className="flex rounded-full overflow-hidden h-3 mx-4">
          {(['gain', 'erosion', 'augment', 'mixed', 'human'] as const).map((key) => {
            const val = result.timeReport[`${key}Hr` as keyof typeof result.timeReport] as number;
            if (val <= 0) return null;
            return (
              <div
                key={key}
                className="h-full"
                style={{
                  backgroundColor: TIME_CATEGORY_COLORS[key],
                  width: `${(val / result.timeReport.totalHr) * 100}%`,
                }}
              />
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          당신의 AI 시프트 지수는? ▶
        </p>
      </div>
    </div>
  );
}

function NaverBlogCard({ result, mbti }: { result: AnalysisResult; mbti: string }) {
  const monthlySavedHr = Math.round((result.timeReport.gainHr + result.timeReport.augmentHr) * 22);
  return (
    <div className="bg-card rounded-2xl border border-border/30 overflow-hidden">
      <div className="bg-[#03c75a]/10 px-5 py-4">
        <p className="text-sm font-bold text-foreground">
          AI를 통해 매월 {monthlySavedHr}시간을 버는 법
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">AI Life Shift 진단 리포트</p>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{result.personaEmoji}</span>
          <div>
            <p className="text-sm font-semibold text-foreground">{mbti === 'UNKNOWN' ? '' : mbti + ': '}{result.persona}</p>
            <p className="text-xs text-muted-foreground">AI 시프트 지수 {result.shiftIndex}%</p>
          </div>
        </div>
        {/* Rainbow bar */}
        <div className="flex rounded-full overflow-hidden h-3">
          {result.activities.map((act, i) => (
            <div
              key={i}
              className="h-full"
              style={{
                backgroundColor: REPLACEMENT_COLORS[act.replacement_level],
                width: `${(act.original_duration_hr / result.timeReport.totalHr) * 100}%`,
              }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>획득 {result.timeReport.gainHr}시간</span>
          <span>잠식 {result.timeReport.erosionHr}시간</span>
        </div>
        <p className="text-xs text-muted-foreground">
          생산성 변화: 연간 {result.economicValueYearly.toLocaleString()}원 상당
        </p>
      </div>
    </div>
  );
}

function TwitterCard({ result, mbti }: { result: AnalysisResult; mbti: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border/30 p-5 space-y-4">
      <p className="text-xs text-muted-foreground">X (Twitter) & Threads · 한 줄 요약</p>
      <div className="p-4 bg-secondary/50 rounded-xl">
        <p className="text-sm text-foreground leading-relaxed">
          {result.oneLinerSummary}
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-lg">{result.personaEmoji}</span>
        <span>{mbti === 'UNKNOWN' ? '' : mbti + ': '}{result.persona}</span>
      </div>
    </div>
  );
}

function FacebookCard({ result, mbti }: { result: AnalysisResult; mbti: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border/30 p-5 space-y-4">
      <p className="text-xs text-muted-foreground">Facebook · 유형별 궁합 공유</p>
      <div className="text-center space-y-3 py-4">
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <div className="text-4xl">{result.personaEmoji}</div>
            <p className="text-xs font-medium text-foreground mt-1">{result.persona}</p>
            <p className="text-[10px] text-muted-foreground">{mbti === 'UNKNOWN' ? 'MBTI 모름' : mbti}</p>
          </div>
          <span className="text-2xl">💕</span>
          <div className="text-center">
            <div className="text-4xl">✨</div>
            <p className="text-xs font-medium text-foreground mt-1">{result.compatiblePersona}</p>
            <p className="text-[10px] text-muted-foreground">{result.compatibleMBTI}</p>
          </div>
        </div>
        <p className="text-sm text-foreground">
          나({result.persona})와 가장 잘 맞는 AI 파트너는<br />
          <strong>[{result.compatibleMBTI}: {result.compatiblePersona}]</strong>입니다.
        </p>
        <p className="text-xs text-muted-foreground">👉 친구를 태그해보세요!</p>
      </div>
    </div>
  );
}
