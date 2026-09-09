import { describe, it, expect } from "vitest";
import { diagnose, scoreTasks, axesOf, toPublicSummary, REALISM, HEADROOM } from "@/lib/diagnosis-engine";
import { SHIFT_TYPES, typeOf, neighborsOf, quadrantOf } from "@/lib/shift-types";
import { OCCUPATIONS, TASKS, tasksOf, MAX_TASKS } from "@/lib/task-matrix";
import type { DiagnosisInput, TaskEntry } from "@/lib/diagnosis-types";

const input = (tasks: TaskEntry[], occupationId = "designer"): DiagnosisInput => ({
  occupationId,
  tasks,
  track: "A",
});

describe("유형16.md — 16유형 체계", () => {
  it("유형이 정확히 16개이고 번호가 1~16이다", () => {
    expect(SHIFT_TYPES).toHaveLength(16);
    expect(SHIFT_TYPES.map((t) => t.id)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  });

  it("네이밍 원칙 4 — 분류 용어(초급/중급/레벨/A형)를 쓰지 않는다", () => {
    for (const t of SHIFT_TYPES) {
      expect(t.name).not.toMatch(/초급|중급|고급|레벨|[A-D]형|\d단계/);
    }
  });

  it("네이밍 원칙 5 — 이름이 공유 카드 한 줄에 들어간다", () => {
    for (const t of SHIFT_TYPES) {
      expect(t.name.length).toBeLessThanOrEqual(12);
    }
  });

  it("4축 조합 16가지가 서로 다른 유형으로 떨어진다", () => {
    const ids = new Set<number>();
    for (const exposure of [80, 20]) {
      for (const usage of [80, 10]) {
        for (const composition of ["knowledge", "relational"] as const) {
          for (const density of ["overloaded", "roomy"] as const) {
            ids.add(typeOf({ exposure, usage, composition, density }).id);
          }
        }
      }
    }
    expect(ids.size).toBe(16);
  });

  it("분면이 노출도 × 활용도로 갈린다", () => {
    expect(quadrantOf(80, 10)).toBe(1);
    expect(quadrantOf(80, 80)).toBe(2);
    expect(quadrantOf(20, 10)).toBe(3);
    expect(quadrantOf(20, 80)).toBe(4);
  });

  it("F2 — 인접 유형 2개는 같은 분면 안에서 축 하나만 다르다", () => {
    for (const t of SHIFT_TYPES) {
      const ns = neighborsOf(t.id);
      expect(ns).toHaveLength(2);
      for (const n of ns) {
        expect(n.quadrant).toBe(t.quadrant);
        expect(n.id).not.toBe(t.id);
      }
      expect(ns[0].id).not.toBe(ns[1].id);
    }
  });
});

describe("PRD §9-7 — MBTI 축을 버렸다", () => {
  it("같은 업무 입력이면 항상 같은 유형이 나온다 (제3의 축 없음)", () => {
    const tasks: TaskEntry[] = [{ taskId: "doc_draft", hoursPerWeek: 10, usage: "none" }];
    const a = diagnose(input(tasks));
    const b = diagnose(input(tasks));
    expect(a.type.id).toBe(b.type.id);
  });
});

describe("절감 추정", () => {
  it("이미 많이 쓰는 업무는 남은 여지가 적다", () => {
    const none = diagnose(input([{ taskId: "doc_draft", hoursPerWeek: 10, usage: "none" }]));
    const much = diagnose(input([{ taskId: "doc_draft", hoursPerWeek: 10, usage: "much" }]));
    expect(none.savableWeeklyHours).toBeGreaterThan(much.savableWeeklyHours);
  });

  it("현실 계수를 넘어서는 절감을 내지 않는다", () => {
    const r = diagnose(input([{ taskId: "data_entry", hoursPerWeek: 40, usage: "none" }]));
    expect(r.savableWeeklyHours).toBeLessThanOrEqual(40 * REALISM * HEADROOM.none);
  });

  it("절감 추정은 총 업무 시간을 넘지 않는다", () => {
    const r = diagnose(
      input([
        { taskId: "data_entry", hoursPerWeek: 12, usage: "none" },
        { taskId: "doc_format", hoursPerWeek: 8, usage: "none" },
      ])
    );
    expect(r.savableWeeklyHours).toBeLessThan(r.totalWeeklyHours);
  });

  it("노출도가 낮은 업무만 하면 절감이 거의 없다", () => {
    const r = diagnose(input([{ taskId: "client_meeting", hoursPerWeek: 20, usage: "none" }]));
    expect(r.savableWeeklyHours).toBeLessThan(2);
  });
});

describe("업무 지도 — D4", () => {
  it("대면 업무는 당신만 할 수 있는 일로 간다", () => {
    const r = diagnose(
      input([
        { taskId: "client_meeting", hoursPerWeek: 6, usage: "none" },
        { taskId: "data_entry", hoursPerWeek: 6, usage: "none" },
      ])
    );
    expect(r.yours.map((t) => t.taskId)).toContain("client_meeting");
    expect(r.delegable.map((t) => t.taskId)).toContain("data_entry");
  });

  it("모든 업무는 둘 중 한 쪽에만 들어간다", () => {
    const r = diagnose(input(tasksOf("office").slice(0, 5).map((p) => ({ taskId: p.id, hoursPerWeek: 4, usage: "some" as const }))));
    expect(r.yours.length + r.delegable.length).toBe(r.tasks.length);
  });
});

describe("S6-5 그래서 뭘 — A/B 트랙 분기", () => {
  const tasks: TaskEntry[] = [
    { taskId: "client_meeting", hoursPerWeek: 6, usage: "none" },
    { taskId: "doc_draft", hoursPerWeek: 8, usage: "none" },
  ];

  it("B 트랙은 이력서 정렬 기준을 준다 (US-7)", () => {
    const r = diagnose({ occupationId: "office", tasks, track: "B" });
    expect(r.soWhat.headline).toMatch(/이력서/);
  });

  it("A 트랙은 시간을 일 단위로 옮긴다 (US-3)", () => {
    const r = diagnose({ occupationId: "designer", tasks, track: "A" });
    expect(r.soWhat.headline).not.toMatch(/이력서/);
  });

  it("어느 트랙도 확정 금액·대체 연도를 쓰지 않는다 (PRD 3.4 원칙 2)", () => {
    for (const track of ["A", "B"] as const) {
      const r = diagnose({ occupationId: "designer", tasks, track });
      const text = [
        r.soWhat.headline,
        ...r.soWhat.lines,
        r.nextStep.headline,
        r.nextStep.detail,
        r.surprise ?? "",
      ].join(" ");
      expect(text).not.toMatch(/원\b|만원|\d{4}년|몇 년 (뒤|후)|대체됩니다|사라집니다/);
    }
  });
});

describe("S6-7 다음 한 걸음 — 딱 하나", () => {
  it("항상 한 개만 제시한다", () => {
    const r = diagnose(
      input([
        { taskId: "doc_draft", hoursPerWeek: 8, usage: "none" },
        { taskId: "research", hoursPerWeek: 6, usage: "none" },
        { taskId: "invoice", hoursPerWeek: 3, usage: "none" },
      ])
    );
    expect(r.nextStep.taskId).toBeTruthy();
    expect(typeof r.nextStep.headline).toBe("string");
  });

  it("강의·상품 판매 링크를 붙이지 않는다 (US-9)", () => {
    const r = diagnose(input([{ taskId: "doc_draft", hoursPerWeek: 8, usage: "none" }]));
    expect(`${r.nextStep.headline} ${r.nextStep.detail}`).not.toMatch(/강의|수강|결제|구매|http/);
  });
});

describe("S6-6 먼저 바뀔 것", () => {
  it("최대 2개까지만 제시한다", () => {
    const r = diagnose(input(tasksOf("office").map((p) => ({ taskId: p.id, hoursPerWeek: 5, usage: "none" as const }))));
    expect(r.changingFirst.length).toBeLessThanOrEqual(2);
  });
});

describe("화면정의 S7/S8 — 공개 요약에 원문이 없다", () => {
  it("요약에 개별 업무명·시간이 들어가지 않는다", () => {
    const r = diagnose(
      input([
        { taskId: "invoice", hoursPerWeek: 3.5, usage: "none" },
        { taskId: "client_meeting", hoursPerWeek: 7, usage: "some" },
      ])
    );
    const json = JSON.stringify(toPublicSummary(r));
    expect(json).not.toContain(TASKS.invoice.label);
    expect(json).not.toContain("3.5");
    expect(json).toContain("문서·행정");
  });
});

describe("직종 × 업무 프리셋 매트릭스", () => {
  it("직종이 15~20개다 (화면정의 S1)", () => {
    expect(OCCUPATIONS.length).toBeGreaterThanOrEqual(15);
    expect(OCCUPATIONS.length).toBeLessThanOrEqual(20);
  });

  it("모든 직종이 업무 8~10개를 갖는다 (화면정의 S2)", () => {
    for (const o of OCCUPATIONS) {
      expect(o.taskIds.length).toBeGreaterThanOrEqual(8);
      expect(o.taskIds.length).toBeLessThanOrEqual(10);
    }
  });

  it("직종의 업무 id 가 모두 실재하고 중복이 없다", () => {
    for (const o of OCCUPATIONS) {
      expect(new Set(o.taskIds).size).toBe(o.taskIds.length);
      for (const id of o.taskIds) expect(TASKS[id]).toBeDefined();
    }
  });

  it("모든 직종에 맡길 일과 지킬 일이 함께 있다 — 한쪽만 나오는 결과를 막는다", () => {
    for (const o of OCCUPATIONS) {
      const presets = tasksOf(o.id);
      // D4 는 "당신만 할 수 있는 일"을 먼저 보여준다. 그 목록이 비는 직종이 있으면
      // 결과가 "당신은 전부 맡겨도 됩니다"로 읽힌다 — 프리셋 단계에서 막는다.
      expect(presets.filter((p) => p.exposure >= 50).length, o.label).toBeGreaterThanOrEqual(2);
      expect(presets.filter((p) => p.exposure < 50).length, o.label).toBeGreaterThanOrEqual(2);
    }
  });

  it("A·B 두 갈래를 모두 덮는다 (PRD 2.1)", () => {
    expect(OCCUPATIONS.some((o) => o.lean === "A")).toBe(true);
    expect(OCCUPATIONS.some((o) => o.lean === "B")).toBe(true);
  });

  it("업무 id 는 이벤트 로깅에 그대로 실을 수 있는 형태다", () => {
    for (const id of Object.keys(TASKS)) {
      expect(id).toMatch(/^[a-z0-9_]{1,64}$/);
    }
  });

  it("업무 상한이 7개다 (화면정의 S2)", () => {
    expect(MAX_TASKS).toBe(7);
  });
});

describe("입력 방어", () => {
  it("없는 업무 id 는 조용히 무시한다", () => {
    const r = diagnose(input([{ taskId: "does_not_exist", hoursPerWeek: 5, usage: "none" }]));
    expect(r.tasks).toHaveLength(0);
    expect(r.savableWeeklyHours).toBe(0);
  });

  it("업무가 하나도 없어도 유형이 나온다", () => {
    const r = diagnose(input([]));
    expect(r.type).toBeDefined();
    expect(r.nextStep.headline).toBeTruthy();
  });

  it("음수 시간은 0으로 눕힌다", () => {
    const scored = scoreTasks(input([{ taskId: "doc_draft", hoursPerWeek: -10, usage: "none" }]));
    expect(scored[0].hoursPerWeek).toBe(0);
  });

  it("축 계산이 빈 입력에서 깨지지 않는다", () => {
    const axes = axesOf([]);
    expect(axes.exposure).toBe(0);
    expect(axes.usage).toBe(0);
  });
});
