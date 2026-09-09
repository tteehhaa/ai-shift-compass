import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { MAX_TASKS, RECOMMENDED_MAX, RECOMMENDED_MIN, tasksOf } from "@/lib/task-matrix";
import type { AiUsage, TaskEntry } from "@/lib/diagnosis-types";

/**
 * S2 + S3 통합 화면 — PRD 3.6 **D2**
 *
 * "체크하면 그 자리에서 슬라이더 펼침." 경쟁사(careeragents.org)가 슬라이더 8개를
 * 한 화면에서 처리하는 것을 보고 단계 하나를 줄인 결정이다.
 *
 * 이 화면이 가장 무겁다 → 기본값을 강하게 준다. 슬라이더는 프리셋 중앙값,
 * AI 사용은 "조금"이 미리 선택돼 있어 **그냥 넘겨도 결과가 나온다** (화면정의 S3).
 */
interface Props {
  occupationId: string;
  entries: TaskEntry[];
  onChange: (entries: TaskEntry[]) => void;
  onNext: () => void;
}

const USAGE_TABS: Array<{ value: AiUsage; label: string }> = [
  { value: "none", label: "안 씀" },
  { value: "some", label: "조금" },
  { value: "much", label: "많이" },
];

export default function TaskSheet({ occupationId, entries, onChange, onNext }: Props) {
  const presets = useMemo(() => tasksOf(occupationId), [occupationId]);
  const totalHours = entries.reduce((s, e) => s + e.hoursPerWeek, 0);
  const atLimit = entries.length >= MAX_TASKS;

  const toggle = (taskId: string) => {
    const found = entries.find((e) => e.taskId === taskId);
    if (found) {
      onChange(entries.filter((e) => e.taskId !== taskId));
      return;
    }
    if (atLimit) return;
    const preset = presets.find((p) => p.id === taskId);
    if (!preset) return;
    onChange([...entries, { taskId, hoursPerWeek: preset.defaultHours, usage: "some" }]);
  };

  const update = (taskId: string, patch: Partial<TaskEntry>) => {
    onChange(entries.map((e) => (e.taskId === taskId ? { ...e, ...patch } : e)));
  };

  return (
    <div className="pt-6 pb-24">
      <p className="text-xs tracking-widest uppercase text-faint">2 / 3</p>
      <h2 className="font-voice text-2xl text-ink mt-3">이 중에 실제로 하는 일을 골라 주세요</h2>
      <p className="text-sm text-body mt-2">
        고르면 그 자리에서 시간과 AI 사용 정도가 펼쳐집니다. 그냥 넘겨도 결과는 나와요.
      </p>

      {/* 상단 누적 — 즉시 갱신 (화면정의 S3) */}
      <div
        className="sticky top-[57px] z-30 bg-cream rule-top border-b border-rule py-3 mt-6 flex items-baseline justify-between"
        data-testid="task-summary"
      >
        <span className="text-sm text-body">
          합계 <span className="font-voice text-xl text-indigo">주 {Math.round(totalHours * 10) / 10}시간</span>
        </span>
        <span className="text-xs text-faint">
          {entries.length}개 선택됨 · {RECOMMENDED_MIN}~{RECOMMENDED_MAX}개 권장
        </span>
      </div>

      <ul className="mt-2">
        {presets.map((preset) => {
          const entry = entries.find((e) => e.taskId === preset.id);
          const checked = Boolean(entry);
          return (
            <li key={preset.id} className="border-b border-rule py-4">
              <button
                onClick={() => toggle(preset.id)}
                disabled={!checked && atLimit}
                data-testid={`task-${preset.id}`}
                aria-pressed={checked}
                className="w-full flex items-center gap-3 text-left disabled:opacity-40"
              >
                <span
                  aria-hidden
                  className={`w-4 h-4 border flex-shrink-0 ${checked ? "bg-indigo border-indigo" : "border-rule"}`}
                />
                <span className={`text-sm ${checked ? "text-ink font-medium" : "text-body"}`}>
                  {preset.label}
                </span>
              </button>

              {entry && (
                <div className="mt-4 pl-7 space-y-4">
                  <div>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <label className="text-xs text-faint" htmlFor={`hours-${preset.id}`}>
                        주당 시간
                      </label>
                      <span className="text-sm text-indigo font-medium">{entry.hoursPerWeek}시간</span>
                    </div>
                    <input
                      id={`hours-${preset.id}`}
                      type="range"
                      min={0.5}
                      max={40}
                      step={0.5}
                      value={entry.hoursPerWeek}
                      onChange={(e) => update(preset.id, { hoursPerWeek: Number(e.target.value) })}
                      className="w-full accent-indigo"
                    />
                  </div>

                  <div>
                    <p className="text-xs text-faint mb-1.5">AI 사용</p>
                    <div className="flex border border-rule w-full">
                      {USAGE_TABS.map((tab) => (
                        <button
                          key={tab.value}
                          onClick={() => update(preset.id, { usage: tab.value })}
                          data-testid={`usage-${preset.id}-${tab.value}`}
                          aria-pressed={entry.usage === tab.value}
                          className={`flex-1 py-2 text-xs transition-colors ${
                            entry.usage === tab.value
                              ? "bg-primary text-primary-foreground"
                              : "text-body hover:text-indigo"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {atLimit && (
        <p className="mt-4 text-xs text-quiet">
          {MAX_TASKS}개까지만 고를 수 있어요. 시간을 많이 쓰는 것부터 남기세요.
        </p>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-cream border-t border-rule">
        <div className="max-w-2xl mx-auto px-5 py-3">
          <button
            onClick={onNext}
            disabled={entries.length === 0}
            data-testid="tasks-next"
            className="w-full bg-primary text-primary-foreground py-3.5 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            {entries.length === 0 ? "하나만 골라도 돼요" : "다음"}
            {entries.length > 0 && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
