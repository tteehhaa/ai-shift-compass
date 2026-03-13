import { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import type { AnalysisResult } from "@/lib/types";
import { X, Download, Loader2, Check, Link2, MessageSquare } from "lucide-react";
import { REPLACEMENT_COLORS } from "@/lib/analysis-engine";
import { toast } from "sonner";

const SERVICE_URL = "ai-shift-compass.lovable.app";

interface ShareCardsProps {
  result: AnalysisResult;
  mbti: string;
  onClose: () => void;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    setMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);
  return mobile;
}

// ── URL Encoding Helper (추가된 부분) ──
// 사용자의 결과 데이터를 Base64로 인코딩하여 고유 URL을 생성합니다.
const encodeResultToUrl = (result: AnalysisResult, mbti: string): string => {
  try {
    const dataString = JSON.stringify({ result, mbti });
    // 한글 등 유니코드 처리를 위해 encodeURIComponent 사용 후 btoa 변환
    const encoded = btoa(encodeURIComponent(dataString));
    return `https://${SERVICE_URL}/result?data=${encoded}`;
  } catch (error) {
    console.error("Failed to encode result:", error);
    return `https://${SERVICE_URL}`; // 인코딩 실패 시 메인 URL 반환
  }
};

// ── Platform Icons (inline SVG for reliability) ──
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.781 3.632 2.695 6.54 2.717 2.227-.02 4.358-.631 5.8-1.673 1.566-1.132 2.312-2.654 2.312-4.708h.026c0-.006 0-.014-.002-.021-.024-1.755-.677-3.126-1.94-4.078-1.19-.897-2.816-1.37-4.693-1.37h-.015c-1.535.013-2.85.396-3.907 1.14-1.093.769-1.725 1.822-1.836 3.048l2.062.187c.07-.78.442-1.4 1.107-1.847.7-.47 1.612-.712 2.712-.72 1.354.01 2.479.319 3.34.919.796.553 1.246 1.36 1.266 2.27v.022c.004.376-.036.73-.12 1.06-.282 1.09-.96 1.94-1.963 2.458-1.003.517-2.312.778-3.893.778h-.018c-1.424-.008-2.496-.35-3.186-1.017-.653-.633-.996-1.55-1.02-2.728l-2.082.041c.032 1.62.55 2.91 1.54 3.838 1.05 1.01 2.552 1.537 4.465 1.537h.091z" />
    </svg>
  );
}

function NaverIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z" />
    </svg>
  );
}

function KakaoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 01-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.664 6.201 3 12 3z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
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
      <span className="mx-0.5" style={{ color: REPLACEMENT_COLORS.medium }}>
        L
      </span>
      <span style={{ color: REPLACEMENT_COLORS.low }}>i</span>
      <span style={{ color: REPLACEMENT_COLORS.assist }}>f</span>
      <span style={{ color: REPLACEMENT_COLORS.human }}>e</span>
      <span className="ml-1 text-gray-500">Shift</span>
    </span>
  );
}

// ── Share Card (9:16) ──
function ShareCard({ result, mbti }: { result: AnalysisResult; mbti: string }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        aspectRatio: "9/16",
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
      <div className="flex-1 flex flex-col items-center justify-center space-y-5">
        <div className="text-center space-y-1">
          <div className="text-5xl mb-2">{result.personaEmoji}</div>
          <p className="text-gray-400 text-[10px] tracking-[0.2em] uppercase">My AI Persona</p>
          <h3 className="text-gray-900 text-lg font-bold">
            {mbti !== "UNKNOWN" ? `${mbti}: ` : ""}
            {result.persona}
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
            <p className="text-2xl font-bold" style={{ color: REPLACEMENT_COLORS.human }}>
              {result.humanTimePercent}%
            </p>
          </div>
        </div>
        <div className="w-full px-3 py-2.5 rounded-xl bg-white/80 border border-gray-100">
          <p className="text-[10px] text-gray-500 text-center leading-relaxed">💡 {result.wellnessAdvice}</p>
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-xs font-semibold" style={{ color: "#3b82f6" }}>
          👉 너도 해봐! 나의 AI 시프트 진단
        </p>
        <p className="text-[8px] text-gray-300">{SERVICE_URL}</p>
      </div>
    </div>
  );
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

// ═══════════════════════════════════
// Main Share Modal
// ═══════════════════════════════════
export default function ShareCards({ result, mbti, onClose }: ShareCardsProps) {
  const [copied, setCopied] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // ⭐️ 핵심 수정: 내 결과가 포함된 공유용 동적 URL 생성
  const myResultUrl = encodeResultToUrl(result, mbti);

  // ⭐️ 텍스트 수정: 하드코딩된 URL 대신 myResultUrl 사용
  const getShareText = () => {
    const base = `나의 AI 시프트 지수는 ${result.shiftIndex}%! 나는 ${mbti === "UNKNOWN" ? "" : mbti + ": "}${result.persona}. ${result.oneLinerSummary}`;
    return `${base}\n\n👉 나의 결과 확인 및 테스트하기:\n${myResultUrl}`;
  };

  const captureCard = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    try {
      const canvas = await html2canvas(cardRef.current, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
      return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
    } catch {
      return null;
    }
  };

  const downloadBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ai-shift-result.png";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Download + toast ──
  const handleDownloadAndToast = async () => {
    setCapturing(true);
    const blob = await captureCard();
    setCapturing(false);
    if (!blob) {
      toast.error("이미지 생성에 실패했습니다.");
      return;
    }
    downloadBlob(blob);
    toast.success("이미지가 저장되었습니다. 원하는 앱에서 업로드하세요!");
  };

  // ── Link copy with fallback ──
  const handleCopyLink = async () => {
    const text = getShareText();
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = fallbackCopyText(text);
    }
    if (ok) {
      setCopied(true);
      toast.success("링크가 복사되었습니다!");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("복사에 실패했습니다. 직접 복사해주세요.");
    }
  };

  // ── Instagram: download + deep link ──
  const handleInstagram = async () => {
    setCapturing(true);
    const blob = await captureCard();
    setCapturing(false);
    if (!blob) {
      toast.error("이미지 생성에 실패했습니다.");
      return;
    }
    downloadBlob(blob);
    toast.success("이미지가 저장되었습니다! 인스타그램에서 업로드하세요.");
    if (isMobile) {
      setTimeout(() => {
        window.location.href = "instagram://app";
      }, 500);
    }
  };

  // ── Threads: download + deep link ──
  const handleThreads = async () => {
    setCapturing(true);
    const blob = await captureCard();
    setCapturing(false);
    if (!blob) {
      toast.error("이미지 생성에 실패했습니다.");
      return;
    }
    downloadBlob(blob);
    toast.success("이미지가 저장되었습니다! 쓰레드에서 업로드하세요.");
    if (isMobile) {
      setTimeout(() => {
        window.location.href = "barcelona://app";
      }, 500);
    }
  };

  // ── Naver Blog ──
  const handleNaverBlog = () => {
    const title = encodeURIComponent(`나의 AI 시프트 지수: ${result.shiftIndex}% - ${result.persona}`);
    // ⭐️ 네이버 URL 공유 시 동적 URL 파라미터 적용
    const url = encodeURIComponent(myResultUrl);
    window.open(`https://blog.naver.com/openapi/share?url=${url}&title=${title}`, "_blank", "width=600,height=500");
  };

  // ── KakaoTalk: Web Share API or fallback ──
  const handleKakao = async () => {
    if (isMobile && navigator.share) {
      const blob = await captureCard();
      if (blob) {
        const file = new File([blob], "ai-shift-result.png", { type: "image/png" });
        const shareData: ShareData = { title: "AI Life Shift 진단 결과", text: getShareText(), files: [file] };
        if (navigator.canShare?.(shareData)) {
          try {
            await navigator.share(shareData);
            return;
          } catch {
            /* cancelled */
          }
        }
      }
    }
    // Fallback: copy link
    await handleCopyLink();
    toast.info("카카오톡에 붙여넣기(Ctrl+V) 해주세요!");
  };

  // ── SMS ──
  const handleSMS = () => {
    const text = encodeURIComponent(getShareText());
    const separator = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "&" : "?";
    window.location.href = `sms:${separator}body=${text}`;
  };

  // ── X (Twitter) ──
  const handleX = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  // Platform button data
  const platforms = [
    { id: "instagram", label: "인스타그램", icon: InstagramIcon, handler: handleInstagram, color: "#E4405F" },
    { id: "threads", label: "쓰레드", icon: ThreadsIcon, handler: handleThreads, color: "#000000" },
    { id: "naver", label: "네이버 블로그", icon: NaverIcon, handler: handleNaverBlog, color: "#03C75A" },
    { id: "kakao", label: "카카오톡", icon: KakaoIcon, handler: handleKakao, color: "#FEE500" },
    { id: "sms", label: "문자", icon: MessageSquare, handler: handleSMS, color: "#34C759" },
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

        <div className="p-6">
          {/* Card Preview */}
          <div ref={cardRef}>
            <ShareCard result={result} mbti={mbti} />
          </div>

          {capturing && (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              공유 이미지를 생성 중입니다...
            </div>
          )}

          {/* Platform Buttons */}
          <div className="mt-5">
            <p className="text-xs text-muted-foreground text-center mb-3">공유할 플랫폼을 선택하세요</p>
            <div className="grid grid-cols-5 gap-2">
              {platforms.map(({ id, label, icon: Icon, handler, color }) => (
                <button
                  key={id}
                  onClick={handler}
                  disabled={capturing}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl hover:bg-secondary/80 transition-all disabled:opacity-50 group"
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: id === "kakao" ? color : `${color}15` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: id === "kakao" ? "#3B1E1E" : color }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Utility row */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleDownloadAndToast}
              disabled={capturing}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {capturing ? "생성 중..." : "이미지 저장"}
            </button>
            <button
              onClick={handleCopyLink}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
              {copied ? "복사됨!" : "링크 복사"}
            </button>
          </div>

          {/* PC: extra X button */}
          {!isMobile && (
            <div className="mt-2">
              <button
                onClick={handleX}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                <XIcon className="w-3.5 h-3.5" /> X(트위터)에 공유
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
