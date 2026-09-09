import type { PublicSummary } from "./diagnosis-types";
import type { TaskCategory } from "./task-matrix";

/**
 * 궁합 (S8) — PRD 3.5 "네트워크 설계". 확산의 엔진.
 *
 * 규칙
 *  · 상대의 업무 상세는 절대 보여주지 않는다. 범주명만 겹친다 (화면정의 S8 "원문 노출 금지").
 *  · 문구는 **4분면 × 4분면 = 16조합**. 16×16=256 은 과하다 (PRD §10).
 */

export interface PairingView {
  /** 둘 다 아직 안 맡기고 있는 영역 */
  bothUntouched: TaskCategory[];
  /** 내가 맡겨도 되는 일인데 상대는 직접 하는 강점으로 가진 영역 */
  theyCoverForYou: TaskCategory[];
  /** 반대 방향 */
  youCoverForThem: TaskCategory[];
  /** 유형 조합 한 줄 */
  line: string;
}

const QUADRANT_TONE: Record<number, string> = {
  1: "맡길 게 많은데 아직 손으로 하는",
  2: "이미 맡기면서 달리는",
  3: "맡길 게 원래 적은",
  4: "필요 이상으로 맡겨 둔",
};

/** 4×4 조합 문구. [내 분면][상대 분면] */
const PAIR_LINES: Record<number, Record<number, string>> = {
  1: {
    1: "둘 다 아직 손으로 하는 중이에요. 같은 일을 각자 두 번 하고 있을 가능성이 큽니다 — 한 사람이 먼저 해보고 방법을 넘기면 반나절이 굳어요.",
    2: "상대는 이미 넘겨 본 사람입니다. 도구를 묻지 말고 **어디까지 맡기고 어디서 손대는지**를 물어보세요.",
    3: "두 분의 일 성격이 다릅니다. 상대에게 배울 건 도구가 아니라, 안 줄여도 되는 일을 붙잡는 배짱이에요.",
    4: "상대는 많이 맡겨 봤지만 줄어든 게 적은 쪽입니다. 뭘 맡겼다가 되돌렸는지 물어보면 시행착오를 통째로 아낍니다.",
  },
  2: {
    1: "당신이 먼저 가 본 길입니다. 상대에게 도구 목록 대신 **처음 한 번**을 같이 해주세요.",
    2: "둘 다 잘 타고 있어요. 다음 대화는 '뭘 더 맡길까'가 아니라 '비운 시간에 뭘 넣을까'입니다.",
    3: "당신은 속도, 상대는 밀도입니다. 상대의 일 중에 굳이 빠르게 만들면 안 되는 게 뭔지 들어보세요.",
    4: "둘 다 많이 맡기는 쪽인데 결과가 갈립니다. 무엇을 맡겼는지 목록을 맞대 보면 차이가 바로 보여요.",
  },
  3: {
    1: "상대는 지금 시간이 가장 많이 새는 쪽입니다. 당신 눈에는 뻔한 게 상대에겐 아직 안 보여요.",
    2: "상대의 속도가 부럽더라도 그대로 따라 할 일은 아닙니다. 당신 일은 원래 그렇게 굴러가는 일이에요.",
    3: "둘 다 서두를 필요 없는 구성입니다. 대신 기록만 남겨 두세요 — 나중에 넘길 때 그게 재료가 됩니다.",
    4: "상대는 많이 맡겨 둔 쪽입니다. 사람 손이 빠져서 아쉬워진 데가 없는지 물어보면 서로 배웁니다.",
  },
  4: {
    1: "당신은 도구를 많이 써봤고 상대는 아직입니다. 다만 당신도 일이 줄지는 않았죠 — 실패담이 더 도움 됩니다.",
    2: "상대는 맡긴 만큼 줄인 쪽입니다. 뭘 **안** 맡기는지 물어보세요. 거기에 차이가 있습니다.",
    3: "상대는 원래 맡길 게 적은 일을 합니다. 당신이 자동화한 것 중 되돌릴 게 있는지 비춰 보기 좋아요.",
    4: "둘 다 도구는 충분합니다. 이제 필요한 건 새 도구가 아니라, 손으로 되돌릴 하나를 고르는 일이에요.",
  },
};

function intersect(a: TaskCategory[], b: TaskCategory[]): TaskCategory[] {
  const set = new Set(b);
  return a.filter((x) => set.has(x));
}

export function buildPairing(mine: PublicSummary, theirs: PublicSummary): PairingView {
  return {
    bothUntouched: intersect(mine.untouchedCategories, theirs.untouchedCategories),
    theyCoverForYou: intersect(mine.delegableCategories, theirs.yoursCategories),
    youCoverForThem: intersect(theirs.delegableCategories, mine.yoursCategories),
    line: PAIR_LINES[mine.quadrant]?.[theirs.quadrant] ?? "",
  };
}

export function quadrantTone(quadrant: number): string {
  return QUADRANT_TONE[quadrant] ?? "";
}
