import { useState } from "react";
import { Star, Send, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AccuracyFeedbackProps {
  diagnosisId: string | null;
}

export default function AccuracyFeedback({ diagnosisId }: AccuracyFeedbackProps) {
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (score === 0) {
      toast({ title: "별점을 선택해주세요.", variant: "destructive" });
      return;
    }
    if (!diagnosisId) {
      toast({ title: "진단 데이터를 찾을 수 없습니다.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("accuracy_feedback" as any).insert({
        diagnosis_id: diagnosisId,
        accuracy_score: score,
        comment: comment.trim() || null,
      } as any);

      if (error) throw error;
      setSubmitted(true);
      toast({ title: "피드백 감사합니다! 🙏", description: "진단 정확도 개선에 반영됩니다." });
    } catch {
      toast({ title: "잠시 후 다시 시도해주세요.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="glass-card rounded-3xl p-8 text-center">
        <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500" />
        <p className="text-sm font-semibold text-foreground">피드백이 제출되었습니다!</p>
        <p className="text-xs text-muted-foreground mt-1">더 정확한 진단을 위해 소중하게 활용하겠습니다.</p>
      </div>
    );
  }

  const activeScore = hoverScore || score;

  return (
    <div className="glass-card rounded-3xl p-6">
      <div className="text-center mb-4">
        <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-2">Diagnosis Accuracy</p>
        <h3 className="text-base font-bold text-foreground">이 진단 결과가 정확했나요?</h3>
        <p className="text-xs text-muted-foreground mt-1">별점으로 진단 정확도를 평가해주세요</p>
      </div>

      {/* Star Rating */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setScore(s)}
            onMouseEnter={() => setHoverScore(s)}
            onMouseLeave={() => setHoverScore(0)}
            className="transition-transform hover:scale-110 active:scale-95"
          >
            <Star
              className={cn(
                "w-8 h-8 transition-colors",
                s <= activeScore ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
              )}
            />
          </button>
        ))}
      </div>
      {activeScore > 0 && (
        <p className="text-xs text-center text-muted-foreground mb-3">
          {activeScore === 1 && "전혀 맞지 않아요"}
          {activeScore === 2 && "조금 맞아요"}
          {activeScore === 3 && "보통이에요"}
          {activeScore === 4 && "꽤 정확해요"}
          {activeScore === 5 && "매우 정확해요!"}
        </p>
      )}

      {/* Optional Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="개선할 점이 있다면 알려주세요 (선택)"
        className="w-full h-20 rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mb-3"
        maxLength={500}
      />

      <button
        onClick={handleSubmit}
        disabled={submitting || score === 0}
        className="w-full rounded-2xl bg-foreground text-background py-3 font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" />
        피드백 제출하기
      </button>
    </div>
  );
}
