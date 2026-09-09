import { useState } from "react";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { createPairing } from "@/lib/diagnosis-store";
import { trackClick } from "@/lib/analytics";

/**
 * S8a. 궁합 초대 — PRD 3.5 "확산의 엔진"
 *
 * 이메일은 **필수**다. 궁합 결과는 메일로 보내기로 했고, 확산 장치의 대가로
 * 연락처를 받는 교환이기 때문이다 (PRD 3.4 원칙 6).
 * 건너뛰면 초대 링크 자체가 생성되지 않는다.
 *
 * 다만 진단 본체 앞에는 게이트가 없다 — 여기까지는 이메일 없이 전부 볼 수 있다.
 */

const emailSchema = z.string().trim().email("올바른 이메일 주소를 입력해주세요.").max(255);

interface Props {
  diagnosisId: string | null;
  onCreated: (pairingId: string) => void;
}

export default function PairInvite({ diagnosisId, onCreated }: Props) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast({ title: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    if (!diagnosisId) {
      toast({ title: "결과 저장이 끝난 뒤에 다시 눌러 주세요.", variant: "destructive" });
      return;
    }

    setBusy(true);
    trackClick("S8", "create_invite", { diagnosisId });
    const pairingId = await createPairing(diagnosisId, parsed.data);
    setBusy(false);

    if (!pairingId) {
      toast({ title: "초대 링크를 만들지 못했습니다.", variant: "destructive" });
      return;
    }
    onCreated(pairingId);
  };

  return (
    <section className="rule-top pt-8" data-testid="pair-invite">
      <h3 className="text-lg font-medium text-ink">같은 일 하는 사람과 비교해 보세요</h3>
      <p className="text-sm text-body mt-2 leading-relaxed">
        두 사람의 업무 지도를 겹쳐서, 둘 다 아직 안 맡기고 있는 일과 서로 커버해 주는 부분을 보여드려요.
        겹쳐 본 결과는 메일로 보내드립니다.
      </p>

      <div className="mt-5 flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="your@email.com"
          data-testid="invite-email"
          className="flex-1 h-11 border border-rule bg-transparent px-3 text-sm text-ink placeholder:text-faint focus-visible:outline-none focus-visible:border-[var(--indigo)]"
        />
        <button
          onClick={submit}
          disabled={busy}
          data-testid="invite-submit"
          className="h-11 px-6 bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
        >
          {busy ? "만드는 중" : "초대 링크 만들기"}
        </button>
      </div>

      <p className="text-xs text-faint leading-relaxed mt-3">
        수집 항목: 이메일 주소 · 목적: 궁합 결과 발송 · 보관 기간: 수신 거부 시까지 (최대 12개월)
      </p>
    </section>
  );
}
