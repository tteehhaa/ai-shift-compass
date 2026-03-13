import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, ArrowRight, Shield } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().trim().email("올바른 이메일 주소를 입력해주세요.").max(255);

interface EmailGateProps {
  mbti: string;
  shiftIndex: number;
  onContinue: () => void;
}

export default function EmailGate({ mbti, shiftIndex, onContinue }: EmailGateProps) {
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    if (!agreed) {
      toast.error("개인정보 수집 및 이용에 동의해주세요.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("email_subscribers").insert({
        email: result.data,
        mbti: mbti || null,
        shift_index: shiftIndex,
      });

      if (error) {
        if (error.code === "23505") {
          toast.success("이미 등록된 이메일입니다. 결과를 확인해보세요!");
        } else {
          throw error;
        }
      } else {
        toast.success("등록 완료! 정식 출시 소식을 가장 먼저 알려드립니다 🎉");
      }
      onContinue();
    } catch {
      toast.error("잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Mail className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            진단이 완료되었습니다!
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            이메일을 등록하시면 정식 버전 출시 시<br />
            <strong>개인화된 심층 리포트</strong>를 가장 먼저 받아보실 수 있습니다.
          </p>
        </div>

        {/* Email Form */}
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && agreed && handleSubmit()}
            placeholder="your@email.com"
            className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />

          {/* Privacy Consent */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                  agreed
                    ? "bg-primary border-primary"
                    : "border-muted-foreground/30 group-hover:border-muted-foreground/50"
                }`}
              >
                {agreed && (
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">[필수]</strong> 개인정보 수집 및 이용에 동의합니다.
              <br />
              <span className="text-[10px]">수집항목: 이메일 주소 · 목적: 서비스 업데이트 알림 · 보유기간: 동의 철회 시까지</span>
            </span>
          </label>

          <button
            onClick={handleSubmit}
            disabled={loading || !email || !agreed}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "등록 중..." : (
              <>
                등록하고 결과 확인하기
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Skip */}
        <button
          onClick={onContinue}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          건너뛰고 결과 보기 →
        </button>

        {/* Trust Signal */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/60">
          <Shield className="w-3 h-3" />
          <span>입력하신 정보는 안전하게 보호됩니다</span>
        </div>
      </div>
    </div>
  );
}
