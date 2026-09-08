import { useState, useCallback } from "react";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { trackScreenEnter, trackClick } from "@/lib/analytics";
import { useEffect } from "react";

/**
 * S9. 이메일 — 선택 구독
 *
 * 화면정의 S9
 *  · 위치: S6 결과를 **전부 본 뒤** 하단
 *  · 금지: 진단 결과 앞에 게이트 걸기
 *  · 표기: 수집 목적·보관 기간·수신 거부 방법 명시
 *
 * PRD 3.4 원칙 6: 진단 결과 앞에는 게이트를 걸지 않는다.
 */

const emailSchema = z.string().trim().email("올바른 이메일 주소를 입력해주세요.").max(255);

interface SubscribeOptionsProps {
  mbti: string;
  shiftIndex: number;
  diagnosisId?: string | null;
}

const OPTIONS = [
  {
    id: "recheck" as const,
    label: "2주 뒤 다시 해보고 얼마나 바뀌었는지 비교해 드릴게요",
    hint: "2주 후 1회",
  },
  {
    id: "weekly" as const,
    label: "이번 주엔 이것만 — 주간 한 줄 받기",
    hint: "주 1회",
  },
];

export default function SubscribeOptions({ mbti, shiftIndex, diagnosisId }: SubscribeOptionsProps) {
  const [email, setEmail] = useState("");
  const [recheck, setRecheck] = useState(false);
  const [weekly, setWeekly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    trackScreenEnter("S9", { diagnosisId });
  }, [diagnosisId]);

  const handleSubmit = useCallback(async () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast({ title: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    if (!recheck && !weekly) {
      toast({ title: "받아보실 항목을 하나 이상 골라주세요.", variant: "destructive" });
      return;
    }

    setSaving(true);
    trackClick("S9", "subscribe", {
      diagnosisId,
      props: { recheck, weekly },
    });

    try {
      if (diagnosisId) {
        // 비어 있을 때만 채우는 RPC. 남의 진단에 이메일을 덮어쓸 수 없다.
        await supabase.rpc("attach_diagnosis_email", {
          _id: diagnosisId,
          _email: parsed.data,
        });
      }

      const { error } = await supabase.from("email_subscribers").insert({
        email: parsed.data,
        mbti: mbti || null,
        shift_index: shiftIndex,
        wants_recheck: recheck,
        wants_weekly: weekly,
      });

      // 23505 = 이미 구독 중. 사용자 입장에서는 성공과 같다.
      if (error && error.code !== "23505") throw error;

      setDone(true);
      toast({ title: "신청됐습니다.", description: "메일함에서 확인하실 수 있어요." });
    } catch {
      toast({ title: "잠시 후 다시 시도해주세요.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [email, recheck, weekly, mbti, shiftIndex, diagnosisId]);

  if (done) {
    return (
      <section className="border-t border-rule pt-8">
        <p className="text-body">신청됐습니다. 보내드릴 때 수신 거부 링크를 같이 넣어 둘게요.</p>
      </section>
    );
  }

  return (
    <section className="border-t border-rule pt-8" aria-labelledby="s9-heading">
      <h3 id="s9-heading" className="text-lg font-medium text-ink mb-1">
        더 받아보시겠어요?
      </h3>
      <p className="text-sm text-muted mb-5">안 받으셔도 결과는 그대로 남아 있어요.</p>

      <div className="space-y-3 mb-5">
        {OPTIONS.map((opt) => {
          const checked = opt.id === "recheck" ? recheck : weekly;
          const setChecked = opt.id === "recheck" ? setRecheck : setWeekly;
          return (
            <label key={opt.id} className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-1 w-4 h-4 accent-[var(--indigo)] shrink-0"
              />
              <span className="text-sm text-body leading-relaxed">
                {opt.label}
                <span className="text-xs text-faint ml-2">{opt.hint}</span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="your@email.com"
          className="flex-1 h-11 border border-rule bg-transparent px-3 text-sm text-ink placeholder:text-faint focus-visible:outline-none focus-visible:border-[var(--indigo)]"
        />
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="h-11 px-6 bg-[var(--indigo)] text-cream text-sm font-medium disabled:opacity-40"
        >
          {saving ? "보내는 중" : "받아보기"}
        </button>
      </div>

      <p className="text-xs text-faint leading-relaxed mt-3">
        수집 항목: 이메일 주소 · 목적: 선택하신 리포트 발송 · 보관 기간: 수신 거부 시까지 (최대 1년)
        <br />
        모든 메일 하단의 수신 거부 링크로 언제든 해지할 수 있습니다.
      </p>
    </section>
  );
}
