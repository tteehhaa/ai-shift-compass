import { formatHourRange } from "@/lib/estimate";
import type { DiagnosisResult, ScoredTask } from "@/lib/diagnosis-types";

/**
 * S6. 결과 — 화면정의 S6 (7섹션)
 *
 * 배치 근거
 *  · D5 — 유형 카드 + 되찾을 시간을 **한 블록**으로 합쳐 캡처 한 장에 훅이 들어오게
 *  · D4 — "당신만 할 수 있는 일"이 먼저, 딥 인디고. "맡겨도 되는 일"은 아래 무채색
 *  · D3 — 절감량은 범위로만
 *  · D7 — 카드·색 블록 없이 가로선과 여백으로만 위계
 *
 * 언어 규칙(화면정의 S6): "노출도"·"시간 압축 지수"·"자동화" 같은 말을 화면에 쓰지 않는다.
 * 금지: 확정 금액, 대체 연도, 공포 문구.
 */

function HoursBar({ task, max }: { task: ScoredTask; max: number }) {
  const width = max > 0 ? Math.max(2, (task.hoursPerWeek / max) * 100) : 0;
  return (
    <li className="py-2.5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-body">{task.label}</span>
        <span className="text-xs text-faint flex-shrink-0">주 {task.hoursPerWeek}시간</span>
      </div>
      <div className="mt-1.5 h-[3px] w-full bg-[var(--rule)]">
        <div
          className={`h-full ${task.side === "yours" ? "bg-indigo" : "bg-[var(--quiet)]"}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </li>
  );
}

interface Props {
  result: DiagnosisResult;
  /** 공유 시트 열기 (S7) */
  onShare: () => void;
  /** 궁합 초대 열기 (S8a) */
  onInvite: () => void;
  children?: React.ReactNode;
}

export default function ResultReport({ result, onShare, onInvite, children }: Props) {
  const maxHours = Math.max(...result.tasks.map((t) => t.hoursPerWeek), 0);
  const range = formatHourRange(result.savableWeeklyHours);

  return (
    <article className="pb-16">
      {/* ── 1 + 4. 유형 카드 + 되찾을 시간 (D5: 한 블록, 캡처 한 장) ── */}
      <section className="pt-4 pb-9" data-testid="result-headline">
        <p className="text-xs tracking-widest uppercase text-faint mb-3">{result.occupationLabel}</p>
        <h2 className="font-voice text-3xl sm:text-4xl leading-tight text-ink">{result.type.name}</h2>
        <p className="text-sm text-body mt-2">{result.type.line}</p>

        <p className="mt-9 text-xs tracking-widest uppercase text-faint">되찾을 수 있는 시간</p>
        <p className="font-voice text-5xl text-indigo mt-1" data-testid="saved-range">
          {range}
        </p>
        <p className="text-xs text-faint mt-3 leading-relaxed">
          공개 지표를 참고해 산출한 추정치입니다. 확정된 수치가 아닙니다.
        </p>
      </section>

      {/* ── 2. 내 일주일 — "맞네" 구간 ── */}
      <section className="rule-top pt-8" data-testid="my-week">
        <h3 className="text-lg font-medium text-ink">내 일주일</h3>
        <p className="text-xs text-faint mt-1">
          고른 업무 {result.tasks.length}개 · 합계 주 {result.totalWeeklyHours}시간
        </p>
        <ul className="mt-4">
          {[...result.tasks]
            .sort((a, b) => b.hoursPerWeek - a.hoursPerWeek)
            .map((t) => (
              <HoursBar key={t.taskId} task={t} max={maxHours} />
            ))}
        </ul>

        {/* PRD 3.7 F3 — 의외의 한 줄 */}
        {result.surprise && (
          <p className="mt-6 border-l-2 border-indigo pl-4 text-sm text-ink leading-relaxed" data-testid="surprise">
            {result.surprise}
          </p>
        )}
      </section>

      {/* ── 3. 업무 지도 — D4: 강점이 먼저 ── */}
      <section className="rule-top pt-8" data-testid="work-map-yours">
        <h3 className="text-lg font-medium text-ink">당신만 할 수 있는 일</h3>
        <p className="text-xs text-faint mt-1">AI에 잘 안 밀리는 쪽입니다</p>
        {result.yours.length ? (
          <ul className="mt-4 space-y-2">
            {result.yours.map((t) => (
              <li key={t.taskId} className="flex items-baseline justify-between gap-4">
                <span className="text-base text-indigo">{t.label}</span>
                <span className="text-xs text-faint flex-shrink-0">주 {t.hoursPerWeek}시간</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-body">
            고른 업무가 대부분 맡길 수 있는 쪽이에요. 그만큼 손에 남는 시간이 커집니다.
          </p>
        )}
      </section>

      <section className="rule-top pt-8" data-testid="work-map-delegable">
        <h3 className="text-lg font-medium text-quiet">맡겨도 되는 일</h3>
        <p className="text-xs text-faint mt-1">손 떼도 되는 부분입니다</p>
        {result.delegable.length ? (
          <ul className="mt-4 space-y-2">
            {result.delegable.map((t) => (
              <li key={t.taskId} className="flex items-baseline justify-between gap-4">
                <span className="text-base text-body">{t.label}</span>
                <span className="text-xs text-faint flex-shrink-0">주 {t.hoursPerWeek}시간</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-body">
            지금 구성에는 통째로 넘길 만한 게 뚜렷하지 않아요. 서두를 필요 없는 일을 하고 계십니다.
          </p>
        )}
      </section>

      {/* ── 5. 그래서 뭘 — A/B 분기 ── */}
      <section className="rule-top pt-8" data-testid="so-what">
        <h3 className="text-lg font-medium text-ink">{result.soWhat.headline}</h3>
        <div className="mt-3 space-y-2">
          {result.soWhat.lines.map((line) => (
            <p key={line} className="text-sm text-body leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      </section>

      {/* ── 6. 먼저 바뀔 것 — 연도·확률 표기 금지 ── */}
      {result.changingFirst.length > 0 && (
        <section className="rule-top pt-8" data-testid="changing-first">
          <h3 className="text-lg font-medium text-ink">먼저 바뀔 것</h3>
          <p className="text-xs text-faint mt-1">순서가 온다면 이쪽부터입니다</p>
          <ul className="mt-4 space-y-3">
            {result.changingFirst.map((t) => (
              <li key={t.taskId}>
                <p className="text-base text-ink">{t.label}</p>
                <p className="text-xs text-quiet mt-0.5">
                  주 {t.hoursPerWeek}시간 · 지금은 {t.usage === "none" ? "직접 하고 계세요" : "일부만 맡기고 계세요"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── 7. 다음 한 걸음 — 딱 하나. 강의 판매 링크 없음 ── */}
      <section className="rule-top pt-8" data-testid="next-step">
        <h3 className="text-lg font-medium text-ink">다음 한 걸음</h3>
        <p className="font-voice text-2xl text-indigo mt-3">{result.nextStep.headline}</p>
        <p className="text-sm text-body mt-2 leading-relaxed">{result.nextStep.detail}</p>
      </section>

      {/* 근거 표기 — 매핑표 전체는 비공개 (PRD 3.4 원칙 4) */}
      <p className="rule-top pt-5 mt-8 text-xs text-faint leading-relaxed">
        공개 지표를 참고해 산출한 추정치입니다. 업무별 계수는 서비스 내부 기준이며 전체 매핑표는 공개하지
        않습니다.
      </p>

      {/* 확산 — S7 공유 / S8a 궁합 */}
      <div className="mt-8 space-y-3">
        <button
          onClick={onInvite}
          data-testid="open-invite"
          className="w-full bg-primary text-primary-foreground py-4 text-sm font-semibold"
        >
          같은 일 하는 사람과 비교해 보기
        </button>
        <button
          onClick={onShare}
          data-testid="open-share"
          className="w-full border border-rule py-4 text-sm text-body hover:border-indigo hover:text-indigo transition-colors"
        >
          결과 저장·공유하기
        </button>
      </div>

      {children}
    </article>
  );
}
