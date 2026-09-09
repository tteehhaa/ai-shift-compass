import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackClick } from "@/lib/analytics";
import { neighborsOf } from "@/lib/shift-types";
import type { DiagnosisResult } from "@/lib/diagnosis-types";

/**
 * F2. 반박 버튼 — PRD 3.7 "이거 안 맞는데요"
 *
 * MBTI가 퍼진 이유는 정확해서가 아니라 "이거 나 아닌데?"라고 말하고 싶어져서다.
 * 유형16.md 마지막 절: 유형 이름은 정답이 아니라 **대화의 시작점**으로 취급한다.
 *
 * 부수 효과로 정확도 개선 데이터가 쌓인다 (성공 지표 "내 일주일이 맞다" 70%).
 */

type Reason = "tasks" | "hours" | "usage" | "name";

const REASONS: Array<{ id: Reason; label: string }> = [
  { id: "tasks", label: "업무 구성이 틀렸어요" },
  { id: "hours", label: "시간이 틀렸어요" },
  { id: "usage", label: "AI 사용 정도가 틀렸어요" },
  { id: "name", label: "유형 이름이 안 맞아요" },
];

interface Props {
  result: DiagnosisResult;
  diagnosisId: string | null;
  /** 어느 화면으로 되돌릴지 — 업무/시간/사용 정도는 모두 통합 화면(S2+S3)이다 */
  onRevise: () => void;
}

export default function TypeChallenge({ result, diagnosisId, onRevise }: Props) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Reason | null>(null);

  const record = async (reason: Reason) => {
    setPicked(reason);
    trackClick("S6", `challenge_${reason}`, { diagnosisId, props: { type_id: result.type.id } });
    try {
      await supabase.rpc("record_challenge", {
        _diagnosis_id: diagnosisId,
        _type_id: result.type.id,
        _reason: reason,
      });
    } catch {
      // 기록 실패가 화면을 막지 않는다
    }
  };

  if (!open) {
    return (
      <div className="rule-top pt-6 mt-8">
        <button
          onClick={() => {
            setOpen(true);
            trackClick("S6", "challenge_open", { diagnosisId });
          }}
          data-testid="challenge-open"
          className="text-sm text-indigo-soft hover:text-indigo transition-colors"
        >
          이거 안 맞는데요
        </button>
      </div>
    );
  }

  const neighbors = neighborsOf(result.type.id);

  return (
    <section className="rule-top pt-6 mt-8" data-testid="challenge">
      <h3 className="text-base font-medium text-ink">어디가 틀렸나요?</h3>

      {!picked ? (
        <div className="mt-4 space-y-2">
          {REASONS.map((r) => (
            <button
              key={r.id}
              onClick={() => record(r.id)}
              data-testid={`challenge-${r.id}`}
              className="w-full border border-rule py-3 px-4 text-sm text-body text-left hover:border-indigo hover:text-indigo transition-colors"
            >
              {r.label}
            </button>
          ))}
        </div>
      ) : picked === "name" ? (
        <div className="mt-4">
          <p className="text-sm text-body">이 둘 중에는 어떤가요? 옆칸에 있는 유형입니다.</p>
          <ul className="mt-3 space-y-3">
            {neighbors.map((n) => (
              <li key={n.id} className="border border-rule p-4">
                <p className="font-voice text-lg text-ink">{n.name}</p>
                <p className="text-sm text-body mt-1">{n.line}</p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-faint mt-4">
            유형 이름은 정답이 아니라 이야기의 시작점이에요. 어느 쪽이 더 맞는지 알려주시면 다음 사람에게
            더 나은 이름이 갑니다.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-body">고쳐서 다시 볼 수 있어요. 고른 업무는 그대로 남아 있습니다.</p>
          <button
            onClick={onRevise}
            data-testid="challenge-revise"
            className="mt-4 w-full bg-primary text-primary-foreground py-3.5 text-sm font-semibold"
          >
            고쳐서 다시 보기
          </button>
        </div>
      )}
    </section>
  );
}
