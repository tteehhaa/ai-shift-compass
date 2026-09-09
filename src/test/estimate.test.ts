import { describe, it, expect } from "vitest";
import { formatHourRange, toHourRange, weeklyMeaning } from "@/lib/estimate";

describe("D3 — 절감량은 범위로 표시한다", () => {
  it("PRD 예시대로 6.5시간이 5~8시간이 된다", () => {
    expect(formatHourRange(6.5)).toBe("주 5~8시간");
  });

  it("소수점을 절대 만들지 않는다", () => {
    for (const h of [1.1, 2.7, 3.33, 6.5, 9.9, 14.2, 33.7]) {
      expect(formatHourRange(h)).not.toMatch(/\d+\.\d/);
    }
  });

  it("범위는 항상 폭을 가진다 — 한 점으로 찍지 않는다", () => {
    for (const h of [1, 1.2, 2, 3, 5, 8, 13, 21]) {
      const { low, high } = toHourRange(h);
      expect(high).toBeGreaterThan(low);
    }
  });

  it("추정치가 범위 안에 들어온다", () => {
    for (const h of [2, 4.4, 6.5, 11, 20]) {
      const { low, high } = toHourRange(h);
      expect(h).toBeGreaterThanOrEqual(low - 1);
      expect(h).toBeLessThanOrEqual(high + 1);
    }
  });

  it("1시간 미만은 범위 대신 문구로 처리한다", () => {
    expect(formatHourRange(0.4)).toBe("주 1시간 미만");
    expect(formatHourRange(0)).toBe("주 1시간 미만");
  });

  it("음수·NaN에도 깨지지 않는다", () => {
    expect(formatHourRange(-5)).toBe("주 1시간 미만");
    expect(formatHourRange(NaN)).toBe("주 1시간 미만");
  });
});

describe("US-3 — 시간을 일 단위로 옮긴 한 줄", () => {
  it("확정 금액·연도를 쓰지 않는다", () => {
    for (const h of [0.5, 2, 5, 10, 20]) {
      const line = weeklyMeaning(h);
      expect(line).not.toMatch(/원|만원|\d{4}년/);
    }
  });
});
