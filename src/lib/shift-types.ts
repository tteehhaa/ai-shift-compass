import type { ShiftType, TypeAxes } from "./diagnosis-types";

/**
 * 16유형 — `docs/class/유형16.md` 를 그대로 옮긴 것.
 *
 * 축 A(노출도) × 축 B(활용도) 로 4분면, 각 분면을 축 C(구성) × 축 D(밀도) 로 4등분.
 * 분면 안의 순서는 문서와 같다: (지식·과부하) → (지식·여유) → (관계·과부하) → (관계·여유)
 *
 * 네이밍 원칙 중 첫 번째: **나쁜 유형이 하나도 없다.**
 */

const QUADRANT_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "맡길 게 많은데, 아직 다 손으로",
  2: "맡길 게 많고, 이미 맡기는 중",
  3: "맡길 게 적고, 안 맡기는 중",
  4: "맡길 게 적은데, 많이 맡기는 중",
};

interface TypeSeed {
  id: number;
  name: string;
  line: string;
  quadrant: 1 | 2 | 3 | 4;
}

const SEEDS: TypeSeed[] = [
  { id: 1,  quadrant: 1, name: "야근하는 필경사",       line: "다 잘하는데, 다 직접 해서 밤이 짧아요" },
  { id: 2,  quadrant: 1, name: "조용한 정비공",         line: "맡길 게 많은데, 아직 손에 익은 대로 하는 중" },
  { id: 3,  quadrant: 1, name: "발로 뛰는 만능키",      line: "사람도 챙기고 서류도 챙기느라 몸이 두 개" },
  { id: 4,  quadrant: 1, name: "느긋한 해결사",         line: "급할 게 없어서 아직 안 바꿨을 뿐" },
  { id: 5,  quadrant: 2, name: "속도 붙은 조종사",      line: "빨라진 만큼 일도 늘었죠" },
  { id: 6,  quadrant: 2, name: "여유로운 관제사",       line: "직접 하는 대신 시키는 법을 익힌 사람" },
  { id: 7,  quadrant: 2, name: "자동화된 영업꾼",       line: "뒷일은 넘기고 앞에서 사람을 만나요" },
  { id: 8,  quadrant: 2, name: "손 뗀 감독",           line: "할 일과 맡길 일을 이미 나눠 놨어요" },
  { id: 9,  quadrant: 3, name: "판단으로 먹는 심판",    line: "결정이 곧 일이라 넘길 데가 마땅찮아요" },
  { id: 10, quadrant: 3, name: "느린 게 무기인 감정사", line: "빨리 해서 좋을 게 없는 일을 하고 계세요" },
  { id: 11, quadrant: 3, name: "얼굴로 먹는 중개인",    line: "만나야 되는 일이라 줄일 데가 적어요" },
  { id: 12, quadrant: 3, name: "단골 붙잡은 주인장",    line: "사람이 남아 있으면 되는 구조" },
  { id: 13, quadrant: 4, name: "과속하는 실험가",       line: "새 도구는 다 써봤는데 일은 안 줄었어요" },
  { id: 14, quadrant: 4, name: "도구 수집가",          line: "쓰는 것보다 모으는 게 재밌으신 편" },
  { id: 15, quadrant: 4, name: "자동응답 걸어둔 상담사", line: "편해지긴 했는데, 사람이 좀 빠졌어요" },
  { id: 16, quadrant: 4, name: "기계에 맡긴 이야기꾼",  line: "당신 목소리가 제일 큰 자산인데요" },
];

export const SHIFT_TYPES: ShiftType[] = SEEDS.map((s) => ({
  ...s,
  quadrantLabel: QUADRANT_LABELS[s.quadrant],
}));

/** 축 A·B 의 분면 경계. 값을 한 곳에서만 만지도록 상수로 뺀다. */
export const EXPOSURE_THRESHOLD = 55;
export const USAGE_THRESHOLD = 45;
/** 축 D — 주당 총 업무 시간 기준 (주 40시간 = 과부하 시작점) */
export const OVERLOAD_HOURS = 40;

export function quadrantOf(exposure: number, usage: number): 1 | 2 | 3 | 4 {
  const highExposure = exposure >= EXPOSURE_THRESHOLD;
  const highUsage = usage >= USAGE_THRESHOLD;
  if (highExposure && !highUsage) return 1;
  if (highExposure && highUsage) return 2;
  if (!highExposure && !highUsage) return 3;
  return 4;
}

export function typeOf(axes: TypeAxes): ShiftType {
  const quadrant = quadrantOf(axes.exposure, axes.usage);
  const offset =
    axes.composition === "knowledge"
      ? axes.density === "overloaded"
        ? 0
        : 1
      : axes.density === "overloaded"
        ? 2
        : 3;
  const id = (quadrant - 1) * 4 + offset + 1;
  return SHIFT_TYPES[id - 1];
}

export function typeById(id: number): ShiftType | undefined {
  return SHIFT_TYPES.find((t) => t.id === id);
}

/**
 * F2 반박 버튼 — "유형 이름이 안 맞음" 을 고르면 인접 유형 2개를 준다.
 * 인접 = 같은 분면에서 축 하나만 다른 것 (유형16.md 마지막 절).
 */
export function neighborsOf(id: number): ShiftType[] {
  const type = typeById(id);
  if (!type) return [];
  const base = (type.quadrant - 1) * 4;
  const offset = id - base - 1; // 0~3
  // 0 지식·과부하 / 1 지식·여유 / 2 관계·과부하 / 3 관계·여유
  const flipDensity = offset ^ 1;
  const flipComposition = offset ^ 2;
  return [SHIFT_TYPES[base + flipDensity], SHIFT_TYPES[base + flipComposition]];
}
