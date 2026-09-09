import { TASKS, getOccupation } from "./task-matrix";
import type { TaskCategory } from "./task-matrix";
import type {
  AiUsage,
  DiagnosisInput,
  DiagnosisResult,
  PublicSummary,
  ScoredTask,
  TypeAxes,
} from "./diagnosis-types";
import { OVERLOAD_HOURS, typeOf } from "./shift-types";
import { formatHourRange, toHourRange } from "./estimate";

/**
 * 진단 엔진 — PRD §9-7 "분류 엔진 교체: PERSONA_MAP → 노출도 × 활용도 16유형"
 *
 * MBTI 축은 없다. PRD §9 "코드에서 버릴 것": 제3의 축이며 차별점을 흐린다.
 */

/** 활용도 0~100 환산. 화면정의 S3 의 3택과 1:1 */
export const USAGE_SCORE: Record<AiUsage, number> = { none: 0, some: 50, much: 100 };

/**
 * 남은 여지. 이미 많이 쓰고 있으면 더 줄일 게 적다.
 * "안 씀"이어도 1.0 을 그대로 쓰지 않는 이유는 아래 REALISM 이 따로 있기 때문.
 */
export const HEADROOM: Record<AiUsage, number> = { none: 1, some: 0.45, much: 0.12 };

/**
 * 현실 계수 — PRD §10 미결 항목. 이번 사이클 결정값 0.6.
 *
 * 이론상 절감분을 그대로 쓰면 "주 20시간 아낍니다" 같은 숫자가 나온다.
 * 도구 학습·검수·재작업을 감안해 60%만 인정한다. 범위 표기(D3)와 겹쳐
 * 과대 추정을 두 겹으로 막는다.
 */
export const REALISM = 0.6;

/** 업무 지도 좌우를 가르는 노출도 경계 */
export const MAP_SPLIT = 50;

function weightedAverage(pairs: Array<{ value: number; weight: number }>): number {
  const totalWeight = pairs.reduce((s, p) => s + p.weight, 0);
  if (totalWeight <= 0) return 0;
  return pairs.reduce((s, p) => s + p.value * p.weight, 0) / totalWeight;
}

export function scoreTasks(input: DiagnosisInput): ScoredTask[] {
  return input.tasks
    .map((entry) => {
      const preset = TASKS[entry.taskId];
      if (!preset) return null;
      const hours = Math.max(0, entry.hoursPerWeek);
      const savable = hours * (preset.exposure / 100) * HEADROOM[entry.usage] * REALISM;
      return {
        taskId: preset.id,
        label: preset.label,
        category: preset.category,
        hoursPerWeek: hours,
        usage: entry.usage,
        exposure: preset.exposure,
        composition: preset.composition,
        savableHours: Math.round(savable * 10) / 10,
        side: preset.exposure >= MAP_SPLIT ? "delegable" : "yours",
      } satisfies ScoredTask;
    })
    .filter((t): t is ScoredTask => t !== null);
}

export function axesOf(tasks: ScoredTask[]): TypeAxes {
  const totalHours = tasks.reduce((s, t) => s + t.hoursPerWeek, 0);

  const exposure = weightedAverage(tasks.map((t) => ({ value: t.exposure, weight: t.hoursPerWeek })));
  const usage = weightedAverage(
    tasks.map((t) => ({ value: USAGE_SCORE[t.usage], weight: t.hoursPerWeek }))
  );
  const knowledgeHours = tasks
    .filter((t) => t.composition === "knowledge")
    .reduce((s, t) => s + t.hoursPerWeek, 0);

  return {
    exposure: Math.round(exposure),
    usage: Math.round(usage),
    composition: knowledgeHours >= totalHours / 2 ? "knowledge" : "relational",
    density: totalHours >= OVERLOAD_HOURS ? "overloaded" : "roomy",
  };
}

/** S6-7 다음 한 걸음 — 딱 하나. 강의 링크는 붙이지 않는다 (US-9) */
function buildNextStep(tasks: ScoredTask[]): DiagnosisResult["nextStep"] {
  const candidates = [...tasks].sort((a, b) => {
    // 아직 안 쓰는 업무를 먼저, 그다음 절감폭 순
    if (a.usage !== b.usage) {
      return USAGE_SCORE[a.usage] - USAGE_SCORE[b.usage];
    }
    return b.savableHours - a.savableHours;
  });
  const top = candidates.find((t) => t.savableHours > 0) ?? candidates[0];

  if (!top) {
    return {
      taskId: "",
      headline: "이번 주는 그대로 두셔도 됩니다",
      detail: "지금 구성에서는 손댈 곳이 뚜렷하지 않아요. 업무가 바뀌면 다시 해보세요.",
    };
  }

  return {
    taskId: top.taskId,
    headline: `${top.label} 하나만`,
    detail:
      top.usage === "none"
        ? `이번 주엔 ${top.label}을(를) 한 번만 AI에 시켜 보세요. 결과를 그대로 쓰지 말고 고쳐 쓰는 데까지가 한 세트입니다.`
        : `${top.label}은(는) 이미 조금 쓰고 계세요. 이번 주엔 처음부터 끝까지 한 번을 통째로 맡겨 보세요.`,
  };
}

/** S6-5 그래서 뭘 — A/B 트랙 분기 (US-3 / US-7) */
function buildSoWhat(
  result: Omit<DiagnosisResult, "soWhat" | "surprise" | "nextStep">
): DiagnosisResult["soWhat"] {
  const { low, high, belowThreshold } = toHourRange(result.savableWeeklyHours);

  if (result.track === "B") {
    // US-7 이력서 정렬 기준 — "AI가 못 하는 일" 순으로
    const top = result.yours.slice(0, 3);
    return {
      headline: "이력서 맨 위에 올릴 것",
      lines: top.length
        ? [
            ...top.map((t, i) => `${i + 1}. ${t.label}`),
            "AI에 덜 밀리는 순서입니다. 경력기술서도 이 순서로 다시 쓰면 읽는 사람이 다르게 봅니다.",
          ]
        : [
            "지금 고른 업무는 대부분 AI가 잘하는 쪽입니다.",
            "면접에서 앞세울 것은 결과물이 아니라 판단한 근거예요. 그 대목을 문장으로 만들어 두세요.",
          ],
    };
  }

  // A 트랙 — 시간을 건수로 옮긴다. 확정 금액은 쓰지 않는다 (PRD 3.4 원칙 2)
  if (belowThreshold) {
    return {
      headline: "이번 주에 생기는 여유",
      lines: [
        "지금 구성에서는 크게 줄일 구석이 안 보여요.",
        "손이 많이 가는 일이 늘어나는 시점에 다시 해보시면 숫자가 달라집니다.",
      ],
    };
  }
  return {
    headline: "이번 주에 생기는 여유",
    lines: [
      low >= 8
        ? "하루를 통째로 비울 수 있는 크기입니다."
        : low >= 4
          ? "반나절이 비어요. 한 건 더 받을 수 있는 크기입니다."
          : "한 나절은 안 되지만, 매주 쌓이면 달라지는 크기예요.",
      `주 ${low}~${high}시간을 되찾으면 그 시간에 뭘 넣을지는 정해 두는 게 좋아요. 안 정해 두면 지금 하던 일이 그대로 채웁니다.`,
    ],
  };
}

/** PRD 3.7 F3 — "의외의 한 줄". 전체를 정확하게 만들지 말고 한 줄에 집중한다. */
function buildSurprise(tasks: ScoredTask[], occupationLabel: string): string | null {
  const target = tasks
    .filter((t) => t.usage === "none" && t.exposure >= 70 && t.hoursPerWeek >= 2)
    .sort((a, b) => b.hoursPerWeek * b.exposure - a.hoursPerWeek * a.exposure)[0];
  if (!target) return null;

  const hours = Number.isInteger(target.hoursPerWeek)
    ? String(target.hoursPerWeek)
    : target.hoursPerWeek.toFixed(1);
  return `${target.label}에 주 ${hours}시간 쓰고 계시죠. ${occupationLabel} 중에 이걸 아직 처음부터 끝까지 손으로 하는 사람은 계속 줄고 있어요.`;
}

export function diagnose(input: DiagnosisInput): DiagnosisResult {
  const tasks = scoreTasks(input);
  const axes = axesOf(tasks);
  const type = typeOf(axes);
  const occupation = getOccupation(input.occupationId);

  const totalWeeklyHours = Math.round(tasks.reduce((s, t) => s + t.hoursPerWeek, 0) * 10) / 10;
  const savableWeeklyHours = Math.round(tasks.reduce((s, t) => s + t.savableHours, 0) * 10) / 10;

  const yours = tasks.filter((t) => t.side === "yours").sort((a, b) => a.exposure - b.exposure);
  const delegable = tasks
    .filter((t) => t.side === "delegable")
    .sort((a, b) => b.savableHours - a.savableHours);

  // S6-6 먼저 바뀔 것 — 이미 많이 쓰는 업무는 뺀다. 연도·확률은 만들지 않는다.
  const changingFirst = tasks
    .filter((t) => t.exposure >= 70 && t.usage !== "much")
    .sort((a, b) => b.exposure * b.hoursPerWeek - a.exposure * a.hoursPerWeek)
    .slice(0, 2);

  const base = {
    occupationId: input.occupationId,
    occupationLabel: occupation?.label ?? "직접 입력",
    track: input.track,
    axes,
    type,
    tasks,
    totalWeeklyHours,
    savableWeeklyHours,
    yours,
    delegable,
    changingFirst,
  };

  return {
    ...base,
    nextStep: buildNextStep(tasks),
    soWhat: buildSoWhat(base as Omit<DiagnosisResult, "soWhat" | "surprise" | "nextStep">),
    surprise: buildSurprise(tasks, base.occupationLabel),
  };
}

function uniqueCategories(tasks: ScoredTask[]): TaskCategory[] {
  return Array.from(new Set(tasks.map((t) => t.category)));
}

/**
 * 공유·궁합용 요약. 화면정의 S7/S8: **개인 업무명 원문 노출 금지** —
 * 범주명만 남기고 라벨과 시간은 버린다.
 */
export function toPublicSummary(result: DiagnosisResult): PublicSummary {
  return {
    typeId: result.type.id,
    typeName: result.type.name,
    typeLine: result.type.line,
    quadrant: result.type.quadrant,
    occupationLabel: result.occupationLabel,
    savedRange: formatHourRange(result.savableWeeklyHours),
    yoursCategories: uniqueCategories(result.yours),
    delegableCategories: uniqueCategories(result.delegable),
    untouchedCategories: uniqueCategories(
      result.tasks.filter((t) => t.usage === "none" && t.exposure >= 60)
    ),
  };
}
