import { useCallback, useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { trackClick, trackScreenEnter } from "@/lib/analytics";
import type { PublicSummary } from "@/lib/diagnosis-types";

/**
 * S7. 공유 + 지목 — 화면정의 S7
 *
 *  · 이미지 3종: 9:16 (스토리) / 1:1 (피드) / 1.91:1 (카톡·링크 미리보기)
 *  · **모바일 우선** — 공유는 거의 전부 모바일에서 일어난다
 *  · 카드와 공개 결과 페이지에 **개인 업무명 원문을 넣지 않는다.** 범주명만
 *  · 지목 카드 (US-12): 그대로 보낼 수 있는 한 문장 + 링크
 */

type Ratio = "9:16" | "1:1" | "1.91:1";

const RATIOS: Array<{ id: Ratio; label: string; hint: string; css: string }> = [
  { id: "9:16", label: "9:16", hint: "스토리", css: "9 / 16" },
  { id: "1:1", label: "1:1", hint: "피드", css: "1 / 1" },
  { id: "1.91:1", label: "1.91:1", hint: "링크 미리보기", css: "1.91 / 1" },
];

interface Props {
  summary: PublicSummary;
  resultUrl: string;
  diagnosisId: string | null;
  onClose: () => void;
}

export default function ShareSheet({ summary, resultUrl, diagnosisId, onClose }: Props) {
  const [ratio, setRatio] = useState<Ratio>("1:1");
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackScreenEnter("S7", { diagnosisId });
  }, [diagnosisId]);

  const copy = useCallback(async (text: string, label: string, target: string) => {
    try {
      await navigator.clipboard.writeText(text);
      trackClick("S7", target, { diagnosisId });
      toast({ title: `${label} 복사됐습니다.` });
    } catch {
      toast({ title: "복사에 실패했습니다.", variant: "destructive" });
    }
  }, [diagnosisId]);

  const saveImage = useCallback(async () => {
    if (!cardRef.current) return;
    setBusy(true);
    trackClick("S7", "save_image", { diagnosisId, props: { ratio: ratio.replace(/[:.]/g, "_") } });
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#F4F2EC",
        scale: 2,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `ai-life-shift-${summary.typeId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "이미지가 저장됐습니다." });
    } catch {
      toast({ title: "이미지 저장에 실패했습니다.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }, [ratio, summary.typeId, diagnosisId]);

  // US-12 지목 — 상대에게 그대로 보낼 수 있는 한 문장
  const nudgeCategory = summary.delegableCategories[0] ?? "문서·행정";
  const nudgeText = `${nudgeCategory} 쪽은 이제 AI가 꽤 잘하더라고요. 아직 손으로 하고 있으면 3분만 써서 한번 재 보세요 — ${resultUrl}`;

  const blogHtml = `<blockquote>
  <p><strong>${summary.typeName}</strong> — ${summary.typeLine}</p>
  <p>되찾을 수 있는 시간: ${summary.savedRange}</p>
  <p><a href="${resultUrl}">내 일주일 진단해 보기</a></p>
</blockquote>`;

  const current = RATIOS.find((r) => r.id === ratio)!;

  return (
    <div className="fixed inset-0 z-50 bg-cream overflow-y-auto">
      <div className="max-w-2xl mx-auto px-5 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-voice text-xl text-ink">결과 저장·공유</h2>
          <button onClick={onClose} aria-label="닫기" className="text-quiet hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 mb-5">
          {RATIOS.map((r) => (
            <button
              key={r.id}
              onClick={() => setRatio(r.id)}
              data-testid={`ratio-${r.id}`}
              className={`flex-1 border py-2.5 text-xs transition-colors ${
                ratio === r.id ? "border-indigo text-indigo" : "border-rule text-quiet"
              }`}
            >
              {r.label}
              <span className="block text-[10px] text-faint mt-0.5">{r.hint}</span>
            </button>
          ))}
        </div>

        {/* 공유 카드 — 개인 업무명 원문 없음. 범주명만 */}
        <div className="flex justify-center">
          <div
            ref={cardRef}
            style={{ aspectRatio: current.css }}
            className="w-full max-w-sm bg-cream border border-rule p-8 flex flex-col justify-between"
          >
            <div>
              <p className="text-[10px] tracking-widest uppercase text-faint">AI LIFE SHIFT</p>
              <p className="text-xs text-quiet mt-4">{summary.occupationLabel}</p>
              <p className="font-voice text-3xl text-ink leading-tight mt-1">{summary.typeName}</p>
              <p className="text-sm text-body mt-2 leading-relaxed">{summary.typeLine}</p>
            </div>

            <div>
              <p className="text-[10px] tracking-widest uppercase text-faint">되찾을 수 있는 시간</p>
              <p className="font-voice text-4xl text-indigo mt-1">{summary.savedRange}</p>
              {summary.yoursCategories.length > 0 && (
                <p className="text-[11px] text-quiet mt-4 leading-relaxed">
                  당신만 할 수 있는 일: {summary.yoursCategories.join(" · ")}
                </p>
              )}
              <p className="text-[10px] text-faint mt-3">추정치입니다 · ai-life-shift</p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <button
            onClick={saveImage}
            disabled={busy}
            data-testid="save-image"
            className="w-full bg-primary text-primary-foreground py-3.5 text-sm font-semibold disabled:opacity-40"
          >
            {busy ? "만드는 중" : "이미지 저장"}
          </button>
          <button
            onClick={() => copy(resultUrl, "결과 링크가", "copy_link")}
            className="w-full border border-rule py-3.5 text-sm text-body hover:border-indigo hover:text-indigo transition-colors"
          >
            결과 링크 복사
          </button>
          <button
            onClick={() => copy(blogHtml, "블로그용 HTML이", "copy_blog")}
            className="w-full border border-rule py-3.5 text-sm text-body hover:border-indigo hover:text-indigo transition-colors"
          >
            블로그에 올리기 (HTML 복사)
          </button>
        </div>

        {/* 지목 카드 — US-12 */}
        <section className="rule-top pt-7 mt-9" data-testid="nudge-card">
          <h3 className="text-lg font-medium text-ink">주변에 떠오르는 사람 있죠?</h3>
          <p className="text-sm text-body mt-2 leading-relaxed">
            당신 업무 중 <span className="text-indigo">{nudgeCategory}</span> 는 AI가 잘하는 일이에요. 아직
            손으로 하는 사람이 있다면 이 문장을 그대로 보내세요.
          </p>
          <p className="mt-4 border border-rule p-4 text-sm text-body leading-relaxed">{nudgeText}</p>
          <button
            onClick={() => copy(nudgeText, "문장이", "copy_nudge")}
            className="mt-3 w-full border border-rule py-3 text-sm text-body hover:border-indigo hover:text-indigo transition-colors"
          >
            문장 + 링크 복사
          </button>
        </section>
      </div>
    </div>
  );
}
