import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * PRD 3.6 — 딥 인디고 단색 + 크림 배경, 종이 질감(D7) 회귀 방지.
 */

const css = readFileSync(join(process.cwd(), "src/index.css"), "utf-8");
const tw = readFileSync(join(process.cwd(), "tailwind.config.ts"), "utf-8");

/**
 * 사용자 대면 화면만 모은다.
 * shadcn ui/ 프리미티브와 /admin(내부 운영 도구)은 PRD 3.6 적용 대상이 아니다.
 */
const ADMIN_FILES = ["AdminDashboard.tsx", "AdminLogin.tsx"];

function appSources(): string {
  const roots = ["components", "pages", "lib"];
  const out: string[] = [];
  for (const root of roots) {
    const dir = join(process.cwd(), "src", root);
    for (const f of readdirSync(dir)) {
      if (!/\.(ts|tsx)$/.test(f)) continue;
      if (ADMIN_FILES.includes(f)) continue;
      out.push(readFileSync(join(dir, f), "utf-8"));
    }
  }
  return out.join("\n");
}

const app = appSources();

describe("PRD 3.6 팔레트", () => {
  const PALETTE = {
    "배경 크림": "#F4F2EC",
    "구분선": "#DCD8CC",
    "메인 딥 인디고": "#26215C",
    "보조": "#534AB7",
    "제목": "#2C2C2A",
    "본문": "#55524B",
    "라벨": "#8A857A",
    "캡션": "#A9A497",
  };

  for (const [name, hex] of Object.entries(PALETTE)) {
    it(`${name} ${hex} 가 토큰으로 정의돼 있다`, () => {
      expect(css.toUpperCase()).toContain(hex);
    });
  }

  it("배경이 크림으로 바뀌었다 (기존 0 0% 98% 흰색 아님)", () => {
    expect(css).toMatch(/--background:\s*45 27% 94%/);
  });

  it("primary 가 딥 인디고다", () => {
    expect(css).toMatch(/--primary:\s*245 47% 25%/);
  });
});

describe("D7 — 종이 질감", () => {
  it("다크 모드가 없다", () => {
    expect(css).not.toMatch(/\.dark\s*\{/);
    expect(tw).toMatch(/darkMode:\s*\[\]/);
  });

  it("카드 대신 가로선을 쓴다 — glass-card 가 배경·그림자를 갖지 않는다", () => {
    expect(css).toMatch(/\.glass-card[\s\S]*?bg-transparent[\s\S]*?shadow-none/);
    expect(css).toMatch(/border-top: 1px solid var\(--rule\)/);
  });

  it("유형 이름용 세리프 계열이 있다", () => {
    expect(tw).toMatch(/voice: \['Noto Serif KR'/);
    expect(css).toMatch(/\.font-voice/);
  });
});

describe("D4 — 강조는 강점 쪽에", () => {
  it("대체 스펙트럼이 신호등(빨강·주황·초록)이 아니다", () => {
    const engine = readFileSync(join(process.cwd(), "src/lib/analysis-engine.ts"), "utf-8");
    for (const banned of ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"]) {
      expect(engine).not.toContain(banned);
    }
  });

  it('"당신만 할 수 있는 일"(human)이 딥 인디고, "맡겨도 되는 일"(critical)이 무채색이다', () => {
    const engine = readFileSync(join(process.cwd(), "src/lib/analysis-engine.ts"), "utf-8");
    expect(engine).toMatch(/human:\s*"#26215C"/);
    expect(engine).toMatch(/critical:\s*"#A9A497"/);
  });

  it("업무 태그에 파스텔 배경 채우기가 없다", () => {
    const types = readFileSync(join(process.cwd(), "src/lib/types.ts"), "utf-8");
    expect(types).not.toMatch(/bgColor: '#(eff6ff|fef2f2|f0fdf4|f9fafb)'/i);
  });
});

describe("PRD 3.6 제외 색", () => {
  it("코랄/앰버 액센트를 쓰지 않는다", () => {
    expect(app).not.toContain("#E85D22");
  });

  it("SaaS 기본값 파랑 유틸리티 클래스를 쓰지 않는다", () => {
    expect(app).not.toMatch(/\b(bg|text|border)-blue-\d{3}\b/);
  });
});
