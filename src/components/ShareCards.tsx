import { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import type { AnalysisResult } from "@/lib/types";
import { Download, Copy, Share2, Check, Loader2, X } from "lucide-react";
import { REPLACEMENT_COLORS } from "@/lib/analysis-engine";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SERVICE_URL = "https://ai-shift-compass.lovable.app";

interface ShareCardsProps {
  result: AnalysisResult;
  mbti: string;
  onClose: () => void;
}

// ── Clipboard fallback ──
function fallbackCopyText(text: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

// ── Rainbow Bar ──
function RainbowBar({ result, height = 14 }: { result: AnalysisResult; height?: number }) {
  const levelDurations: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, assist: 0, human: 0 };
  result.activities.forEach((a) => {
    levelDurations[a.replacement_level] += a.original_duration_hr;
  });
  const total = Object.values(levelDurations).reduce((s, v) => s + v, 0) || 1;
  const order = ["critical", "high", "medium", "low", "assist", "human"] as const;
  return (
    <div className="flex rounded-full overflow-hidden w-full" style={{ height }}>
      {order.map((level) => {
        const val = levelDurations[level];
        if (val <= 0) return null;
        return (
          <div
            key={level}
            style={{ backgroundColor: REPLACEMENT_COLORS[level], width: `${(val / total) * 100}%`, height: "100%" }}
          />
        );
      })}
    </div>
  );
}

function MiniLegend() {
  const items = [
    { color: REPLACEMENT_COLORS.critical, label: "위험" },
    { color: REPLACEMENT_COLORS.high, label: "잠식" },
    { color: REPLACEMENT_COLORS.medium, label: "부분지원" },
    { color: REPLACEMENT_COLORS.low, label: "보조" },
    { color: REPLACEMENT_COLORS.assist, label: "자동화" },
    { color: REPLACEMENT_COLORS.human, label: "인간고유" },
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

// ── Share Card (1:1 for 1080x1080) ──
function ShareCard({ result, mbti }: { result: AnalysisResult; mbti: string }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        aspectRatio: "1/1",
        background: "linear-gradient(160deg, #f8f9fa 0%, #ffffff 40%, #f0f4ff 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "28px 24px",
      }}
    >
      <div className="flex items-center justify-between">
        <LogoMark />
        <span className="text-[10px] text-gray-400 font-medium">AI 시프트 진단</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <div className="text-center space-y-2">
          <div className="text-5xl mb-4">{result.personaEmoji}</div>
          <p className="text-gray-400 text-[10px] tracking-[0.2em] uppercase">My AI Persona</p>
          <h3 className="text-gray-900 text-lg font-bold">
            {mbti !== "UNKNOWN" ? `${mbti}: ` : ""}
            {result.persona}
          </h3>
          <p className="text-gray-400 text-xs">{result.personaTitle}</p>
        </div>
        <div className="w-full space-y-2 px-2">
          <p className="text-gray-400 text-[9px] text-center tracking-wider uppercase">나의 24시간 AI 컬러맵</p>
          <RainbowBar result={result} height={18} />
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
            <p className="text-2xl font-bold" style={{ color: REPLACEMENT_COLORS.human }}>
              {result.humanTimePercent}%
            </p>
          </div>
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-xs font-semibold" style={{ color: "#3b82f6" }}>
          👉 너도 해봐! 나의 AI 시프트 진단
        </p>
        <p className="text-[8px] text-gray-300">ai-shift-compass.lovable.app</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════
// Main Share Modal — 3 buttons only
// ═══════════════════════════════════
export default function ShareCards({ result, mbti, onClose }: ShareCardsProps) {
  const [copied, setCopied] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [savingLink, setSavingLink] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>(SERVICE_URL);
  const [shareId, setShareId] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Supabase에 결과 저장하고 짧은 URL 생성
  const saveAndGetShareUrl = async (): Promise<string | null> => {
    if (shareId) return shareUrl;
    
    setSavingLink(true);
    try {
      const { data, error } = await supabase
        .from("shared_results")
        .insert([
          {
            mbti: mbti || "UNKNOWN",
            result_data: result as unknown as Record<string, unknown>,
          },
        ])
        .select("id")
        .single();

      if (error) throw error;
      
      const id = data.id;
      const shortUrl = `${SERVICE_URL}/result/${id}`;
      setShareId(id);
      setShareUrl(shortUrl);
      return shortUrl;
    } catch (err) {
      console.error("Failed to save share result:", err);
      toast.error("링크 생성에 실패했습니다.");
      return null;
    } finally {
      setSavingLink(false);
    }
  };

  // 모달 열릴 때 자동으로 링크 생성
  useEffect(() => {
    saveAndGetShareUrl();
  }, []);

  const getShareText = (url: string = shareUrl) => {
    const mbtiDisplay = mbti !== "UNKNOWN" ? mbti : "";
    return `[ AI 라이프 시프트 : 나의 진단 리포트 ]

나의 일상 중 ${result.shiftIndex}%가 AI로 대체 또는 활용될 수 있습니다.

나의 AI 페르소나: ${result.personaEmoji} ${mbtiDisplay} ${result.persona}
${result.personaTitle}

나와 가장 잘 맞는 AI 파트너는 누구일까요?

진단 결과 확인하기: ${url}`;
  };

  const captureCard = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    try {
      const el = cardRef.current;
      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        scale: 1080 / el.offsetWidth,
        useCORS: true,
        width: el.offsetWidth,
        height: el.offsetHeight,
      });
      return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
    } catch {
      return null;
    }
  };

  // 1. 이미지 다운로드
  const handleDownload = async () => {
    setCapturing(true);
    const blob = await captureCard();
    setCapturing(false);
    if (!blob) {
      toast.error("이미지 생성에 실패했습니다.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ai-shift-result.png";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("1080×1080 이미지가 저장되었습니다!");
  };

  // 2. 결과 복사
  const handleCopy = async () => {
    const url = await saveAndGetShareUrl();
    if (!url) return;
    
    const text = getShareText(url);
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = fallbackCopyText(text);
    }
    if (ok) {
      setCopied(true);
      toast.success("결과가 클립보드에 복사되었습니다!");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("복사에 실패했습니다.");
    }
  };

  // 3. 공유하기 (Web Share API)
  const handleShare = async () => {
    const url = await saveAndGetShareUrl();
    if (!url) {
      await handleCopy();
      return;
    }

    const shareData: ShareData = {
      title: "[ AI 라이프 시프트 : 나의 진단 리포트 ]",
      text: `나의 일상 중 ${result.shiftIndex}%가 AI로 대체 또는 활용될 수 있습니다.\n\n나의 AI 페르소나: ${result.personaEmoji} ${mbti !== "UNKNOWN" ? mbti : ""} ${result.persona}\n${result.personaTitle}\n\n나와 가장 잘 맞는 AI 파트너는 누구일까요?`,
      url: url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (e) {
        if ((e as DOMException)?.name === "AbortError") return;
      }
    }

    // Fallback: copy text instead
    await handleCopy();
  };

  const btnBase =
    "flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-border/50 text-muted-foreground transition-all duration-200 hover:border-[#E85D22]/40 hover:text-[#E85D22] hover:bg-[#E85D22]/5 active:scale-[0.97] disabled:opacity-40";

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

        <div className="p-6 space-y-5">
          {/* Card preview */}
          <div ref={cardRef}>
            <ShareCard result={result} mbti={mbti} />
          </div>

          {(capturing || savingLink) && (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {savingLink ? "링크 생성 중..." : "이미지 생성 중..."}
            </div>
          )}

          {/* 3 action buttons */}
          <div className="flex gap-3">
            <button onClick={handleDownload} disabled={capturing} className={btnBase}>
              <Download className="w-5 h-5" />
              <span className="text-xs font-medium">이미지 저장</span>
            </button>

            <button onClick={handleCopy} disabled={savingLink} className={btnBase}>
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              <span className="text-xs font-medium">{copied ? "복사됨!" : "결과 복사"}</span>
            </button>

            <button onClick={handleShare} disabled={savingLink} className={btnBase}>
              <Share2 className="w-5 h-5" />
              <span className="text-xs font-medium">공유하기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
