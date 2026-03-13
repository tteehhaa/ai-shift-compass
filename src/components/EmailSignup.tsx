import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Mail, ArrowRight, Check } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().trim().email("올바른 이메일 주소를 입력해주세요.").max(255);

interface EmailSignupProps {
  mbti: string;
  shiftIndex: number;
}

export default function EmailSignup({ mbti, shiftIndex }: EmailSignupProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      toast({ title: result.error.errors[0].message, variant: "destructive" });
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
          toast({ title: "이미 신청하셨습니다! 정식 출시 때 뵙겠습니다 🎉" });
          setSubmitted(true);
        } else {
          throw error;
        }
      } else {
        setSubmitted(true);
        toast({ title: "신청되었습니다! 정식 출시 때 뵙겠습니다 🎉" });
      }
    } catch {
      toast({ title: "잠시 후 다시 시도해주세요.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="glass-card rounded-3xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Check className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm font-semibold text-foreground">신청 완료! 🎉</p>
        <p className="text-xs text-muted-foreground mt-1">
          정식 출시 시 상세 분석지와 1개월 무료 이용권을 보내드립니다.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl p-6">
      <div className="text-center mb-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Mail className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          이 분석 리포트를 메일로 소장하고 정식 출시 혜택을 받으세요! 🎁
        </h3>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          정식 버전 출시 시 <strong>'가장 먼저'</strong> 사용권을 보내드립니다.
        </p>
      </div>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="your@email.com"
          className="flex-1 h-11 rounded-xl border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !email}
          className="h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-all disabled:opacity-40"
        >
          {loading ? (
            "..."
          ) : (
            <>
              알림 신청 <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
