import type { Composition, TaskCategory, Track } from "./task-matrix";

export type { Track };

/** 화면정의 S3 — "안 씀 / 조금 / 많이" 3택 */
export type AiUsage = "none" | "some" | "much";

/** 사용자가 화면에서 만든 입력 한 줄 */
export interface TaskEntry {
  taskId: string;
  hoursPerWeek: number;
  usage: AiUsage;
}

export interface DiagnosisInput {
  occupationId: string;
  tasks: TaskEntry[];
  /** S4 목적 선택. "잘 모르겠어요"는 A 로 떨어진다 */
  track: Track;
}

/** 유형16.md 의 4축 */
export interface TypeAxes {
  /** 축 A. 노출도 0~100 */
  exposure: number;
  /** 축 B. 현재 활용도 0~100 */
  usage: number;
  /** 축 C. 업무 구성 */
  composition: Composition;
  /** 축 D. 시간 밀도 */
  density: "overloaded" | "roomy";
}

export interface ShiftType {
  /** 유형16.md 표의 번호 1~16 */
  id: number;
  name: string;
  line: string;
  /** 1~4분면 */
  quadrant: 1 | 2 | 3 | 4;
  /** 분면 설명 — 궁합 문구가 이 단위로 붙는다 (PRD §10: 4분면 조합 수준으로) */
  quadrantLabel: string;
}

export interface ScoredTask {
  taskId: string;
  label: string;
  category: TaskCategory;
  hoursPerWeek: number;
  usage: AiUsage;
  exposure: number;
  composition: Composition;
  /** 현실 계수까지 반영한 주당 절감 추정 시간 */
  savableHours: number;
  /** 업무 지도에서 어느 쪽에 놓이는가 */
  side: "yours" | "delegable";
}

export interface DiagnosisResult {
  occupationId: string;
  occupationLabel: string;
  track: Track;
  axes: TypeAxes;
  type: ShiftType;
  tasks: ScoredTask[];
  totalWeeklyHours: number;
  /** 점추정. 화면에는 범위로만 나간다 (PRD D3) */
  savableWeeklyHours: number;
  /** 당신만 할 수 있는 일 — D4 에 따라 항상 먼저 */
  yours: ScoredTask[];
  delegable: ScoredTask[];
  /** S6-6. 노출도 최상위 1~2개. 연도·확률은 쓰지 않는다 */
  changingFirst: ScoredTask[];
  /** S6-7. 딱 하나 */
  nextStep: { taskId: string; headline: string; detail: string };
  /** S6-5. A/B 트랙 분기 문구 */
  soWhat: { headline: string; lines: string[] };
  /** PRD 3.7 F3 — "의외의 한 줄" */
  surprise: string | null;
}

/** 공유·궁합에서 외부로 나가는 요약. 개인 업무명 원문을 담지 않는다 (화면정의 S7) */
export interface PublicSummary {
  typeId: number;
  typeName: string;
  typeLine: string;
  quadrant: number;
  occupationLabel: string;
  savedRange: string;
  /** 범주명만 — "문서·행정" 처럼 */
  yoursCategories: TaskCategory[];
  delegableCategories: TaskCategory[];
  /** 노출도는 높은데 아직 "안 씀"인 범주 — 궁합의 "둘 다 안 맡기는 일" 재료 */
  untouchedCategories: TaskCategory[];
}
