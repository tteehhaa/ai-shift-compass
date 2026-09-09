import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildEvent,
  getSessionId,
  sanitizeProps,
  sanitizeTarget,
  type Screen,
} from "@/lib/analytics";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ insert: async () => ({ error: null }) }) },
}));

describe("analytics — 원문 유출 차단", () => {
  it("사용자가 입력한 업무명은 target 으로 나가지 않는다", () => {
    expect(sanitizeTarget("이메일 확인 및 답장")).toBeNull();
    expect(sanitizeTarget("보고서 작성 3시간")).toBeNull();
  });

  it("고정 식별자만 통과한다", () => {
    expect(sanitizeTarget("save_image")).toBe("save_image");
    expect(sanitizeTarget("share_kakaotalk")).toBe("share_kakaotalk");
    expect(sanitizeTarget("START_DIAGNOSIS")).toBe("start_diagnosis");
  });

  it("target 은 64자를 넘지 않는다", () => {
    const long = "a".repeat(200);
    const out = sanitizeTarget(long);
    expect(out === null || out.length <= 64).toBe(true);
  });

  it("props 는 숫자·불리언·짧은 식별자만 남긴다", () => {
    const out = sanitizeProps({
      routine_count: 6,
      is_shared: true,
      activity: "정산 및 세금계산서 발행",
      track: "a",
    });
    expect(out).toEqual({ routine_count: 6, is_shared: true, track: "a" });
    expect(out).not.toHaveProperty("activity");
  });

  it("props 키에 한글·공백이 있으면 버린다", () => {
    expect(sanitizeProps({ "업무 이름": "정산" } as never)).toEqual({});
  });
});

describe("analytics — 이벤트 형태", () => {
  beforeEach(() => sessionStorage.clear());

  it("세션 id 는 한 세션 안에서 유지된다", () => {
    const a = getSessionId();
    const b = getSessionId();
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/i);
  });

  it("이벤트가 스키마가 요구하는 필드를 모두 갖는다", () => {
    const e = buildEvent("click", "S6", { target: "retry", props: { shift_index: 42 } });
    expect(e).toMatchObject({
      event_name: "click",
      screen: "S6",
      target: "retry",
      diagnosis_id: null,
      props: { shift_index: 42 },
    });
    expect(typeof e.session_id).toBe("string");
    expect(() => new Date(e.occurred_at).toISOString()).not.toThrow();
  });

  it("원문이 섞인 호출은 target 이 null 로 떨어진다", () => {
    const e = buildEvent("click", "S2", { target: "업무 추가하기" });
    expect(e.target).toBeNull();
  });
});

describe("analytics — 마이그레이션 제약과의 정합", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20260908000002_analytics_events.sql"),
    "utf-8"
  );

  it("코드가 쓰는 화면 코드가 DB CHECK 제약에 모두 들어 있다", () => {
    const screens: Screen[] = ["S0","S1","S2","S3","S4","S5","S6","S7","S8","S9","E1","ADM"];
    const check = /screen IN \(([^)]+)\)/.exec(sql)?.[1] ?? "";
    for (const s of screens) expect(check).toContain(`'${s}'`);
  });

  it("코드가 쓰는 이벤트명이 DB CHECK 제약에 모두 들어 있다", () => {
    const check = /event_name IN \(([^)]+)\)/.exec(sql)?.[1] ?? "";
    for (const n of ["screen_enter", "screen_exit", "click", "complete", "abandon"]) {
      expect(check).toContain(`'${n}'`);
    }
  });

  it("이벤트 조회는 관리자 전용이다", () => {
    expect(sql).toMatch(/CREATE POLICY "Admins can select events"[\s\S]*?has_role/);
    expect(sql).not.toMatch(/FOR SELECT TO public/);
  });
});
