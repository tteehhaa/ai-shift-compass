import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, fireEvent } from "@testing-library/react";
import Landing from "@/components/flow/Landing";
import OccupationPicker from "@/components/flow/OccupationPicker";
import TaskSheet from "@/components/flow/TaskSheet";
import PurposePicker from "@/components/flow/PurposePicker";
import ResultReport from "@/components/ResultReport";
import { diagnose } from "@/lib/diagnosis-engine";
import { tasksOf, MAX_TASKS } from "@/lib/task-matrix";
import type { TaskEntry } from "@/lib/diagnosis-types";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ insert: async () => ({ error: null }) }),
    rpc: async () => ({ data: null, error: null }),
  },
}));

const src = (p: string) => readFileSync(join(process.cwd(), "src", p), "utf-8");

describe("S0 랜딩 — 화면정의 S0", () => {
  it("배지에서 '가입 없음'을 뺐다 (PRD 3.5 결정)", () => {
    render(<Landing onStart={() => {}} />);
    expect(screen.getByText(/타이핑 없음 · 3분 · 무료/)).toBeInTheDocument();
    expect(screen.queryByText(/가입 없음/)).toBeNull();
  });

  it("헤드라인이 직업이 아니라 일주일을 말한다", () => {
    render(<Landing onStart={() => {}} />);
    expect(screen.getByText(/당신의 일주일을 진단합니다/)).toBeInTheDocument();
  });

  it("로그인·이메일 수집이 랜딩에 없다", () => {
    const { container } = render(<Landing onStart={() => {}} />);
    expect(container.querySelector('input[type="email"]')).toBeNull();
    expect(screen.queryByText(/로그인|회원가입/)).toBeNull();
  });
});

describe("S1 직종 — 화면정의 S1", () => {
  it("칩을 누르면 그 직종으로 넘어간다", () => {
    const onSelect = vi.fn();
    render(<OccupationPicker onSelect={onSelect} onMiss={() => {}} />);
    fireEvent.click(screen.getByTestId("occupation-designer"));
    expect(onSelect).toHaveBeenCalledWith("designer");
  });

  it("검색창은 기본으로 숨어 있다", () => {
    const { container } = render(<OccupationPicker onSelect={() => {}} onMiss={() => {}} />);
    expect(container.querySelector("input")).toBeNull();
    expect(screen.getByText(/목록에 없어요/)).toBeInTheDocument();
  });

  it("찾지 못한 검색어를 계측으로 올린다", () => {
    const onMiss = vi.fn();
    render(<OccupationPicker onSelect={() => {}} onMiss={onMiss} />);
    fireEvent.click(screen.getByText(/목록에 없어요/));
    const input = screen.getByPlaceholderText("직종 검색");
    fireEvent.change(input, { target: { value: "우주비행사" } });
    fireEvent.blur(input);
    expect(onMiss).toHaveBeenCalledWith("우주비행사");
  });
});

describe("S2+S3 통합 화면 — PRD D2", () => {
  const setup = (entries: TaskEntry[] = []) => {
    const onChange = vi.fn();
    const utils = render(
      <TaskSheet occupationId="designer" entries={entries} onChange={onChange} onNext={() => {}} />
    );
    return { onChange, ...utils };
  };

  it("체크하면 그 자리에서 슬라이더와 3택이 펼쳐진다", () => {
    const first = tasksOf("designer")[0];
    const { rerender } = render(
      <TaskSheet occupationId="designer" entries={[]} onChange={() => {}} onNext={() => {}} />
    );
    expect(screen.queryByTestId(`usage-${first.id}-some`)).toBeNull();

    rerender(
      <TaskSheet
        occupationId="designer"
        entries={[{ taskId: first.id, hoursPerWeek: first.defaultHours, usage: "some" }]}
        onChange={() => {}}
        onNext={() => {}}
      />
    );
    expect(screen.getByTestId(`usage-${first.id}-some`)).toBeInTheDocument();
    expect(screen.getByLabelText("주당 시간")).toBeInTheDocument();
  });

  it("기본값이 채워져 있어 그냥 넘겨도 결과가 나온다", () => {
    const first = tasksOf("designer")[0];
    const { onChange } = setup();
    fireEvent.click(screen.getByTestId(`task-${first.id}`));
    expect(onChange).toHaveBeenCalledWith([
      { taskId: first.id, hoursPerWeek: first.defaultHours, usage: "some" },
    ]);
  });

  it("합계가 상단에서 즉시 갱신된다", () => {
    setup([
      { taskId: "design_visual", hoursPerWeek: 6, usage: "some" },
      { taskId: "copywriting", hoursPerWeek: 4, usage: "none" },
    ]);
    expect(screen.getByTestId("task-summary").textContent).toMatch(/주 10시간/);
  });

  it("상한 7개를 넘겨 고를 수 없다", () => {
    const presets = tasksOf("designer");
    const entries = presets.slice(0, MAX_TASKS).map((p) => ({
      taskId: p.id,
      hoursPerWeek: p.defaultHours,
      usage: "some" as const,
    }));
    const { onChange } = setup(entries);
    const extra = presets[MAX_TASKS];
    fireEvent.click(screen.getByTestId(`task-${extra.id}`));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("0개면 다음으로 갈 수 없고 문구로 안내한다", () => {
    setup([]);
    const next = screen.getByTestId("tasks-next") as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    expect(next.textContent).toMatch(/하나만 골라도 돼요/);
  });
});

describe("S4 목적 — 화면정의 S4", () => {
  it('"잘 모르겠어요"는 A 트랙으로 떨어진다', () => {
    const onSelect = vi.fn();
    render(<PurposePicker onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId("track-unsure"));
    expect(onSelect).toHaveBeenCalledWith("A");
  });
});

describe("D1 — S5(계산 중)를 두지 않는다", () => {
  it("인위적 지연 화면이 흐름에 없다", () => {
    const index = src("pages/Index.tsx");
    expect(index).not.toMatch(/AnalysisAnimation|setTimeout\(.*결과/);
    expect(index).toMatch(/type Step = "S0" \| "S1" \| "S2" \| "S4" \| "S6"/);
  });
});

describe("S6 결과 — 7섹션", () => {
  const result = diagnose({
    occupationId: "designer",
    tasks: [
      { taskId: "design_visual", hoursPerWeek: 10, usage: "none" },
      { taskId: "client_meeting", hoursPerWeek: 6, usage: "none" },
      { taskId: "invoice", hoursPerWeek: 3, usage: "none" },
    ],
    track: "A",
  });

  const renderReport = () =>
    render(<ResultReport result={result} onShare={() => {}} onInvite={() => {}} />);

  it("화면정의가 요구한 섹션이 모두 있다", () => {
    renderReport();
    for (const id of [
      "result-headline",
      "my-week",
      "work-map-yours",
      "work-map-delegable",
      "so-what",
      "changing-first",
      "next-step",
    ]) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
  });

  it("D5 — 유형 이름과 되찾을 시간이 한 블록에 있다", () => {
    renderReport();
    const head = screen.getByTestId("result-headline");
    expect(head.textContent).toContain(result.type.name);
    expect(head.textContent).toMatch(/주 \d+~\d+시간|주 1시간 미만/);
  });

  it("D3 — 절감량이 범위로만 나오고 소수점이 없다", () => {
    renderReport();
    expect(screen.getByTestId("saved-range").textContent).not.toMatch(/\d+\.\d/);
  });

  it("추정치임을 결과 최상단에서 명시한다", () => {
    renderReport();
    expect(screen.getByTestId("result-headline").textContent).toMatch(/추정치/);
  });

  it("확정 금액·대체 연도·공포 문구가 없다", () => {
    const { container } = renderReport();
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/[\d,]+원|\d{4}년|대체됩니다|사라집니다|위험합니다/);
  });

  it('금지어("노출도"·"자동화"·"시간 압축 지수")를 화면에 쓰지 않는다', () => {
    const { container } = renderReport();
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/노출도|시간 압축|자동화/);
  });

  it("다음 한 걸음에 강의 판매 링크가 없다", () => {
    renderReport();
    const next = screen.getByTestId("next-step");
    expect(next.querySelector("a")).toBeNull();
    expect(next.textContent).not.toMatch(/강의|수강/);
  });
});
