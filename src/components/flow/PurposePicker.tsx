import type { Track } from "@/lib/diagnosis-types";

/**
 * S4. 목적 선택 — 화면정의 S4
 *
 * "이 한 화면이 결과의 절반을 가른다." 엔진은 공용이고 결과 문구만 갈린다
 * (PRD 3.4 원칙 3). "잘 모르겠어요"는 A 트랙으로 떨어진다.
 */
export default function PurposePicker({ onSelect }: { onSelect: (track: Track) => void }) {
  return (
    <div className="pt-6 pb-16">
      <p className="text-xs tracking-widest uppercase text-faint">3 / 3</p>
      <h2 className="font-voice text-2xl text-ink mt-3 mb-8">이 진단으로 뭘 알고 싶으세요?</h2>

      <div className="space-y-3">
        <button
          onClick={() => onSelect("A")}
          data-testid="track-A"
          className="w-full border border-rule p-6 text-left transition-colors hover:border-indigo group"
        >
          <p className="text-base text-ink group-hover:text-indigo">일을 줄이고 수입을 늘리고 싶어요</p>
          <p className="text-xs text-quiet mt-1.5">되찾은 시간을 일감으로 옮기는 쪽으로 결과를 씁니다</p>
        </button>

        <button
          onClick={() => onSelect("B")}
          data-testid="track-B"
          className="w-full border border-rule p-6 text-left transition-colors hover:border-indigo group"
        >
          <p className="text-base text-ink group-hover:text-indigo">이직·전환을 준비 중이에요</p>
          <p className="text-xs text-quiet mt-1.5">AI에 안 밀리는 업무를 앞세우는 쪽으로 결과를 씁니다</p>
        </button>
      </div>

      <button
        onClick={() => onSelect("A")}
        data-testid="track-unsure"
        className="mt-6 text-xs text-quiet hover:text-indigo-soft transition-colors"
      >
        둘 다 / 잘 모르겠어요
      </button>
    </div>
  );
}
