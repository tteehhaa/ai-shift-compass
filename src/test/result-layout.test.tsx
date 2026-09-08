import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ResultDashboard from "@/components/ResultDashboard";
import type { AnalysisResult, AnalyzedActivity } from "@/lib/types";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      insert: async () => ({ error: null }),
      select: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }),
    }),
    rpc: async () => ({ data: null, error: null }),
  },
}));

const act = (over: Partial<AnalyzedActivity>): AnalyzedActivity =>
  ({
    activity: "이름",
    time: "09:00",
    original_duration_hr: 2,
    ai_involvement: "active",
    category: "문서사무",
    tag: "📧 단순 행정",
    is_high_cognitive: false,
    compression_ratio: 2,
    saved_time_hr: 1,
    agency_adjusted_hr: 1,
    replacement_score: 50,
    replacement_level: "medium",
    ...over,
  }) as AnalyzedActivity;

const result: AnalysisResult = {
  shiftIndex: 62,
  persona: "조용한 정비공",
  personaEmoji: "🔧",
  personaDescription: "설명",
  personaTitle: "맡길 게 많은데, 아직 손에 익은 대로 하는 중",
  activities: [
    act({ activity: "고객 상담", replacement_level: "human", original_duration_hr: 3, saved_time_hr: 0 }),
    act({ activity: "정산 처리", replacement_level: "critical", replacement_score: 92, saved_time_hr: 1.3 }),
    act({ activity: "메일 회신", replacement_level: "high", replacement_score: 80, saved_time_hr: 0.5 }),
  ],
  timeReport: { totalHr: 8, gainHr: 1, erosionHr: 4, augmentHr: 1, mixedHr: 1, humanHr: 3 },
  humanTimePercent: 37,
  economicValueDaily: 20000,
  economicValueMonthly: 440000,
  economicValueYearly: 5200000,
  erosionCostDaily: 30000,
  percentileRank: 38,
  wellnessAdvice: "조언",
  needsDetox: false,
  compatibleMBTI: "ENFP",
  compatiblePersona: "짝",
  compatibleEmoji: "🤖",
  compatibleReason: "이유",
  oneLinerSummary: "한 줄",
  recommendations: [],
};

function renderResult() {
  return render(
    <ResultDashboard result={result} mbti="ISTJ" routines={[]} diagnosisId={null} onShowShare={() => {}} />
  );
}

const source = readFileSync(join(process.cwd(), "src/components/ResultDashboard.tsx"), "utf-8");

describe("D5 — 유형 + 숫자를 한 블록으로", () => {
  it("유형 이름과 되찾을 시간이 같은 섹션에 있다", () => {
    const { container } = renderResult();
    const section = container.querySelector("section");
    expect(section?.textContent).toContain("조용한 정비공");
    expect(section?.textContent).toMatch(/주 \d+~\d+시간/);
  });

  it("유형 이름이 세리프(font-voice)로 나온다", () => {
    renderResult();
    expect(screen.getByText("조용한 정비공")).toHaveClass("font-voice");
  });
});

describe("D3 — 절감량은 범위로", () => {
  it("되찾을 시간이 범위로 표기된다", () => {
    renderResult();
    expect(screen.getByText(/^주 \d+~\d+시간$/)).toBeInTheDocument();
  });

  it("추정치임을 바로 아래에 밝힌다", () => {
    renderResult();
    expect(screen.getByText(/추정치입니다/)).toBeInTheDocument();
  });

  it("대체 연도·확정 금액 표현을 결과 상단에서 쓰지 않는다", () => {
    const { container } = renderResult();
    const head = container.querySelectorAll("section")[0].textContent ?? "";
    expect(head).not.toMatch(/\d{4}년|만원/);
  });
});

describe("D4 — 강점이 먼저, 맡길 일은 아래 무채색", () => {
  it('"당신만 할 수 있는 일"이 "맡겨도 되는 일"보다 앞에 나온다', () => {
    const { container } = renderResult();
    const text = container.textContent ?? "";
    expect(text.indexOf("당신만 할 수 있는 일")).toBeGreaterThan(-1);
    expect(text.indexOf("당신만 할 수 있는 일")).toBeLessThan(text.indexOf("맡겨도 되는 일"));
  });

  it("강점 항목은 인디고, 맡길 일은 무채색으로 칠해진다", () => {
    renderResult();
    const yours = within(screen.getByTestId("work-map-yours"));
    const delegable = within(screen.getByTestId("work-map-delegable"));
    expect(yours.getByText("고객 상담")).toHaveClass("text-indigo");
    expect(delegable.getByText("정산 처리")).toHaveClass("text-quiet");
  });

  it("강점 쪽에 맡길 일이 섞이지 않는다", () => {
    renderResult();
    const yours = within(screen.getByTestId("work-map-yours"));
    expect(yours.queryByText("정산 처리")).toBeNull();
  });

  it("맡길 일이 없어도 비난조로 말하지 않는다", () => {
    const noDelegable = {
      ...result,
      activities: [act({ activity: "상담", replacement_level: "human", saved_time_hr: 0 })],
    };
    render(
      <ResultDashboard result={noDelegable} mbti="ISTJ" routines={[]} diagnosisId={null} onShowShare={() => {}} />
    );
    expect(screen.getByText(/원래 그런 일을 하고 계신/)).toBeInTheDocument();
  });
});

describe("D7 — 종이 질감 유지", () => {
  it("결과 화면에 그라데이션이 없다", () => {
    expect(source).not.toMatch(/linear-gradient|conic-gradient/);
  });

  it("색 블록(배경 채우기)이 없다", () => {
    expect(source).not.toMatch(/bg-white|bg-secondary\/50|bg-destructive\/10/);
  });

  it("둥근 카드가 남아 있지 않다", () => {
    expect(source).not.toMatch(/rounded-3xl|rounded-2xl/);
  });
});
