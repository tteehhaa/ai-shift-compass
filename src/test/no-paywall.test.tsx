import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import SubscribeOptions from "@/components/SubscribeOptions";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ insert: async () => ({ error: null }) }),
    rpc: async () => ({ data: true, error: null }),
  },
}));

const src = (p: string) => readFileSync(join(process.cwd(), "src", p), "utf-8");

describe("PRD 3.4 원칙 6 — 결과 앞 게이트 금지", () => {
  const dashboard = src("components/ResultReport.tsx");

  it("결과 화면에 페이월이 없다", () => {
    expect(dashboard).not.toMatch(/PAYWALL/i);
    expect(dashboard).not.toMatch(/isUnlocked/);
    expect(dashboard).not.toMatch(/paywall/i);
  });

  it("결과 일부를 가리는 블러가 없다", () => {
    expect(dashboard).not.toMatch(/blur-md/);
    expect(dashboard).not.toMatch(/pointer-events-none/);
  });

  it("결과 화면이 이메일 없이도 전부 렌더된다 — 이메일 입력이 결과 조건이 아니다", () => {
    // 결과 섹션들이 조건부 렌더 뒤에 숨지 않는지: 이메일 상태가 아예 없어야 한다
    expect(dashboard).not.toMatch(/setEmail|emailSchema/);
  });

  it("가짜 가격 표기가 사라졌다", () => {
    expect(dashboard).not.toMatch(/9,900원|정가|베타 기간 한정/);
  });
});

describe("화면정의 S9 — 선택 구독", () => {
  it("두 항목 모두 선택 해제 상태로 시작한다", () => {
    render(<SubscribeOptions typeId={2} occupationId="designer" diagnosisId={null} />);
    const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes).toHaveLength(2);
    expect(boxes.every((b) => !b.checked)).toBe(true);
  });

  it("F5 2주 뒤 비교 · F6 주간 한 줄 두 항목을 제시한다", () => {
    render(<SubscribeOptions typeId={2} occupationId="designer" diagnosisId={null} />);
    expect(screen.getByText(/2주 뒤 다시 해보고/)).toBeInTheDocument();
    expect(screen.getByText(/주간 한 줄 받기/)).toBeInTheDocument();
  });

  it("수집 목적·보관 기간·수신 거부 방법을 명시한다", () => {
    render(<SubscribeOptions typeId={2} occupationId="designer" diagnosisId={null} />);
    expect(screen.getByText(/보관 기간/)).toBeInTheDocument();
    expect(screen.getByText(/수신 거부/)).toBeInTheDocument();
  });

  it("구독은 선택임을 문구로 알린다", () => {
    render(<SubscribeOptions typeId={2} occupationId="designer" diagnosisId={null} />);
    expect(screen.getByText(/안 받으셔도 결과는 그대로/)).toBeInTheDocument();
  });
});
