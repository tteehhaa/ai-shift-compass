import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import PairView from "@/components/PairView";
import ShareSheet from "@/components/ShareSheet";
import { buildPairing } from "@/lib/pairing";
import { diagnose, toPublicSummary } from "@/lib/diagnosis-engine";
import { TASKS } from "@/lib/task-matrix";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ insert: async () => ({ error: null }) }), rpc: async () => ({ data: null, error: null }) },
}));

const mine = toPublicSummary(
  diagnose({
    occupationId: "designer",
    tasks: [
      { taskId: "design_visual", hoursPerWeek: 10, usage: "none" },
      { taskId: "invoice", hoursPerWeek: 4, usage: "none" },
      { taskId: "client_meeting", hoursPerWeek: 6, usage: "none" },
    ],
    track: "A",
  })
);

const theirs = toPublicSummary(
  diagnose({
    occupationId: "office",
    tasks: [
      { taskId: "doc_draft", hoursPerWeek: 12, usage: "much" },
      { taskId: "data_entry", hoursPerWeek: 6, usage: "none" },
      { taskId: "schedule", hoursPerWeek: 4, usage: "some" },
    ],
    track: "B",
  })
);

describe("S8 궁합 — PRD 3.5", () => {
  it("둘만 있으면 성립한다 — 전체 통계가 없어도 결과가 나온다", () => {
    const view = buildPairing(mine, theirs);
    expect(view.line.length).toBeGreaterThan(0);
  });

  it("문구가 4분면 × 4분면 = 16조합으로 정의돼 있다 (PRD §10)", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/pairing.ts"), "utf-8");
    const lines = src.match(/^\s{4}\d: "/gm) ?? [];
    expect(lines).toHaveLength(16);
  });

  it("상대의 업무 원문·시간이 화면에 나오지 않는다", () => {
    const { container } = render(<PairView mine={mine} theirs={theirs} />);
    const text = container.textContent ?? "";
    expect(text).not.toContain(TASKS.doc_draft.label);
    expect(text).not.toContain(TASKS.data_entry.label);
    expect(text).not.toMatch(/주 \d+시간짜리/);
  });

  it("겹치는 항목이 없어도 화면이 깨지지 않는다", () => {
    const empty = { ...theirs, yoursCategories: [], delegableCategories: [], untouchedCategories: [] };
    const { container } = render(<PairView mine={mine} theirs={empty} />);
    expect(container.textContent).toMatch(/뚜렷한 겹침이 없어요|겹치는 빈칸이 없어요/);
  });
});

describe("S7 공유 — 화면정의 S7", () => {
  const renderShare = () =>
    render(
      <ShareSheet
        summary={mine}
        resultUrl="https://example.test/r/abc"
        diagnosisId="abc"
        onClose={() => {}}
      />
    );

  it("이미지 3종 비율을 모두 제공한다", () => {
    renderShare();
    for (const ratio of ["9:16", "1:1", "1.91:1"]) {
      expect(screen.getByTestId(`ratio-${ratio}`)).toBeInTheDocument();
    }
  });

  it("공유 카드에 개인 업무명 원문이 없다", () => {
    const { container } = renderShare();
    const text = container.textContent ?? "";
    expect(text).not.toContain(TASKS.design_visual.label);
    expect(text).not.toContain(TASKS.invoice.label);
  });

  it("지목 카드가 보낼 문장과 링크를 함께 준다 (US-12)", () => {
    renderShare();
    const nudge = screen.getByTestId("nudge-card");
    expect(nudge.textContent).toContain("https://example.test/r/abc");
  });

  it("결과 링크가 랜딩이 아니라 결과 페이지를 가리킨다", () => {
    renderShare();
    expect(screen.getByTestId("nudge-card").textContent).toMatch(/\/r\/abc/);
  });
});

describe("동적 OG — 화면정의 S7", () => {
  const og = readFileSync(join(process.cwd(), "api/og.js"), "utf-8");
  const vercel = readFileSync(join(process.cwd(), "vercel.json"), "utf-8");

  it("/r/:id 요청이 OG 함수로 간다", () => {
    expect(vercel).toMatch(/"source":\s*"\/r\/:id"/);
    expect(vercel).toMatch(/"destination":\s*"\/api\/og\?id=:id"/);
  });

  it("유형 이름과 되찾을 시간이 미리보기에 들어간다", () => {
    expect(og).toMatch(/og:title/);
    expect(og).toMatch(/savedRange/);
  });

  it("미리보기에도 업무 원문이 나가지 않는다 — 요약만 읽는다", () => {
    expect(og).toMatch(/get_public_diagnosis/);
    expect(og).not.toMatch(/\.tasks/);
  });
});
