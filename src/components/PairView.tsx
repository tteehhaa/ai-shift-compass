import { buildPairing, quadrantTone } from "@/lib/pairing";
import type { PublicSummary } from "@/lib/diagnosis-types";

/**
 * S8b. 궁합 결과 — 화면정의 S8b
 *
 * 상대의 업무 상세는 요약 수준만. **원문 노출 금지**이므로 범주명만 겹친다.
 */
export default function PairView({
  mine,
  theirs,
}: {
  mine: PublicSummary;
  theirs: PublicSummary;
}) {
  const view = buildPairing(mine, theirs);

  return (
    <div data-testid="pair-view">
      <section className="pt-4 pb-8">
        <p className="text-xs tracking-widest uppercase text-faint mb-4">겹쳐 본 결과</p>
        <div className="grid grid-cols-2 gap-5">
          {[mine, theirs].map((s, i) => (
            <div key={i}>
              <p className="text-xs text-quiet">{i === 0 ? "초대한 쪽" : "초대받은 쪽"}</p>
              <p className="font-voice text-xl text-ink mt-1 leading-snug">{s.typeName}</p>
              <p className="text-xs text-faint mt-1">{s.occupationLabel}</p>
              <p className="text-sm text-indigo mt-3">{s.savedRange}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-faint mt-5">
          {quadrantTone(mine.quadrant)} 쪽과 {quadrantTone(theirs.quadrant)} 쪽의 조합입니다.
        </p>
      </section>

      {view.line && (
        <section className="rule-top pt-8">
          <h3 className="text-lg font-medium text-ink">두 분의 궁합</h3>
          <p className="text-sm text-body mt-3 leading-relaxed">{view.line}</p>
        </section>
      )}

      <section className="rule-top pt-8">
        <h3 className="text-lg font-medium text-ink">둘 다 아직 안 맡기고 있는 일</h3>
        {view.bothUntouched.length ? (
          <ul className="mt-3 space-y-1.5">
            {view.bothUntouched.map((c) => (
              <li key={c} className="text-base text-indigo">
                {c}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-body">겹치는 빈칸이 없어요. 서로 다른 지점에서 새고 있습니다.</p>
        )}
      </section>

      <section className="rule-top pt-8">
        <h3 className="text-lg font-medium text-ink">서로 커버해 주는 부분</h3>
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs text-faint">상대가 당신 약한 곳을 메워 주는 쪽</p>
            <p className="text-base text-body mt-1">
              {view.theyCoverForYou.length ? view.theyCoverForYou.join(" · ") : "뚜렷한 겹침이 없어요"}
            </p>
          </div>
          <div>
            <p className="text-xs text-faint">당신이 메워 줄 수 있는 쪽</p>
            <p className="text-base text-body mt-1">
              {view.youCoverForThem.length ? view.youCoverForThem.join(" · ") : "뚜렷한 겹침이 없어요"}
            </p>
          </div>
        </div>
      </section>

      <p className="rule-top pt-5 mt-8 text-xs text-faint leading-relaxed">
        상대의 업무 상세는 보여드리지 않습니다. 범주 수준으로만 겹쳐 보여드려요.
      </p>
    </div>
  );
}
