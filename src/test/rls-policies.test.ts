import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * PRD 8장 R1~R3 회귀 방지.
 *
 * 마이그레이션 전체를 순서대로 적용했을 때 "최종적으로 살아 있는" 정책만 뽑아,
 * 익명(anon) 쓰기·전체 읽기가 다시 열리지 않았는지 검사한다.
 * DB 접속 없이 SQL 텍스트만으로 검증하므로 CI에서 그대로 돌아간다.
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

interface Policy {
  name: string;
  table: string;
  action: string;
  roles: string[];
  permissive: boolean; // USING (true) / WITH CHECK (true) 처럼 무조건 통과하는지
}

/**
 * 달러 인용 본문($$...$$, $tag$...$tag$)을 제거해 세미콜론 분리를 안전하게 만든다.
 * 함수 본문과 DO 블록 안의 세미콜론이 구문 경계로 잘못 잡히는 것을 막는다.
 *
 * 정규식 대신 선형 스캔을 쓴다. 역참조로 여는/닫는 태그를 맞추려 하면
 * 태그가 없는 파일에서 백트래킹이 폭발한다.
 */
export function stripDollarQuoted(sql: string): string {
  const OPENER = /\$[A-Za-z_]?\w*\$/y;
  let out = "";
  let i = 0;

  while (i < sql.length) {
    if (sql[i] !== "$") {
      out += sql[i++];
      continue;
    }

    OPENER.lastIndex = i;
    const m = OPENER.exec(sql);
    if (!m) {
      out += sql[i++];
      continue;
    }

    const tag = m[0];
    const close = sql.indexOf(tag, i + tag.length);
    if (close === -1) {
      // 닫히지 않은 인용 — 남은 전부가 본문이다
      out += " BODY ";
      break;
    }

    out += " BODY ";
    i = close + tag.length;
  }

  return out;
}

function loadEffectivePolicies(): Map<string, Policy> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const policies = new Map<string, Policy>();

  for (const file of files) {
    const raw = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    const sql = stripDollarQuoted(raw)
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n");

    for (const statement of sql.split(";")) {
      const s = statement.trim();
      if (!s) continue;

      const drop = /^DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"([^"]+)"\s+ON\s+([\w.]+)/i.exec(s);
      if (drop) {
        policies.delete(`${normalizeTable(drop[2])}::${drop[1]}`);
        continue;
      }

      const create =
        /^CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+([\w.]+)\s+FOR\s+(\w+)(?:\s+TO\s+([\w,\s]+?))?\s+(USING|WITH)\b/is.exec(s);
      if (!create) continue;

      const [, name, table, action, roleList] = create;
      const roles = (roleList ?? "public")
        .split(",")
        .map((r) => r.trim().toLowerCase())
        .filter(Boolean);

      policies.set(`${normalizeTable(table)}::${name}`, {
        name,
        table: normalizeTable(table),
        action: action.toUpperCase(),
        roles,
        permissive: /\(\s*true\s*\)/i.test(s),
      });
    }
  }

  return policies;
}

function normalizeTable(t: string): string {
  return t.replace(/^public\./i, "").toLowerCase();
}

/** anon(비로그인)에게 열려 있는 정책인가 */
function isAnonymous(p: Policy): boolean {
  return p.roles.some((r) => r === "public" || r === "anon");
}

const policies = [...loadEffectivePolicies().values()];
const migrationSql = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf-8"))
  .join("\n");

function forTable(table: string, action: string): Policy[] {
  return policies.filter(
    (p) => p.table === table && (p.action === action || p.action === "ALL")
  );
}

describe("RLS 정책 — 익명 쓰기/전체 읽기 차단", () => {
  it("정책 파서가 마이그레이션을 실제로 읽어온다", () => {
    expect(policies.length).toBeGreaterThan(5);
  });

  // ── R1 ──
  it("R1: shared_results 를 익명이 목록 조회할 수 없다", () => {
    const anonSelect = forTable("shared_results", "SELECT").filter(isAnonymous);
    expect(anonSelect).toEqual([]);
  });

  it("R1: 공유 단건 조회는 SECURITY DEFINER RPC 로만 열려 있다", () => {
    expect(migrationSql).toMatch(/CREATE OR REPLACE FUNCTION public\.get_shared_result/);
    expect(migrationSql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.get_shared_result\(uuid\) TO anon, authenticated/
    );
  });

  it("R1: 관리자는 목록 조회를 유지한다", () => {
    const adminSelect = forTable("shared_results", "SELECT").filter((p) => !isAnonymous(p));
    expect(adminSelect.length).toBeGreaterThan(0);
  });

  // ── R2 ──
  it("R2: diagnosis_results 에 익명 UPDATE 정책이 없다", () => {
    const anonUpdate = forTable("diagnosis_results", "UPDATE").filter(isAnonymous);
    expect(anonUpdate).toEqual([]);
  });

  it("R2: email 첨부는 비어 있을 때만 채우는 RPC 로 대체됐다", () => {
    expect(migrationSql).toMatch(/CREATE OR REPLACE FUNCTION public\.attach_diagnosis_email/);
    expect(migrationSql).toMatch(/AND email IS NULL/);
  });

  // ── R3 ──
  it("R3: activity_rankings 에 익명 INSERT/UPDATE 정책이 없다", () => {
    const anonWrite = [
      ...forTable("activity_rankings", "INSERT"),
      ...forTable("activity_rankings", "UPDATE"),
    ].filter(isAnonymous);
    expect(anonWrite).toEqual([]);
  });

  it("R3: 집계는 원자적 upsert RPC 로만 가능하다", () => {
    expect(migrationSql).toMatch(/CREATE OR REPLACE FUNCTION public\.bump_activity_ranking/);
    expect(migrationSql).toMatch(/ON CONFLICT \(activity_name\) DO UPDATE/);
  });

  // ── 개인정보 테이블 전반 ──
  it("개인정보 테이블은 익명 SELECT 가 하나도 없다", () => {
    const sensitive = [
      "diagnosis_results",
      "email_subscribers",
      "accuracy_feedback",
      "user_roles",
      // v2
      "diagnoses",
      "pairings",
      "pairing_emails",
      "challenge_feedback",
      "occupation_misses",
    ];
    const leaks = sensitive.flatMap((t) => forTable(t, "SELECT").filter(isAnonymous));
    expect(leaks).toEqual([]);
  });

  // ── v2 (진단 v2 / 궁합) ──
  it("v2 테이블에는 익명 쓰기 정책이 아예 없다 — 쓰기는 전부 RPC 경유다", () => {
    const v2 = ["diagnoses", "pairings", "pairing_emails", "challenge_feedback", "occupation_misses"];
    const anonWrite = v2.flatMap((t) => [
      ...forTable(t, "INSERT"),
      ...forTable(t, "UPDATE"),
      ...forTable(t, "DELETE"),
    ]).filter(isAnonymous);
    expect(anonWrite).toEqual([]);
  });

  it("공개 조회 RPC 는 요약만 돌려준다 — tasks 컬럼을 내보내지 않는다", () => {
    const fn = /CREATE OR REPLACE FUNCTION public\.get_public_diagnosis[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(
      migrationSql
    );
    expect(fn).not.toBeNull();
    expect(fn![1]).not.toMatch(/d\.tasks/);
    expect(fn![1]).toMatch(/d\.summary/);
  });

  it("궁합 조회 RPC 도 두 사람의 요약만 돌려준다", () => {
    const fn = /CREATE OR REPLACE FUNCTION public\.get_pairing[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(
      migrationSql
    );
    expect(fn).not.toBeNull();
    expect(fn![1]).not.toMatch(/tasks|email/);
  });

  it("이메일 첨부는 v2 에서도 비어 있을 때만 채운다", () => {
    expect(migrationSql).toMatch(/CREATE OR REPLACE FUNCTION public\.attach_email_to_diagnosis/);
    const fn = /CREATE OR REPLACE FUNCTION public\.attach_email_to_diagnosis[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(
      migrationSql
    );
    expect(fn![1]).toMatch(/AND email IS NULL/);
  });

  it("관리자 집계 함수는 has_role 을 다시 확인한다", () => {
    for (const fnName of ["admin_diagnosis_rankings", "admin_challenge_stats", "admin_screen_funnel"]) {
      const fn = new RegExp(
        `CREATE OR REPLACE FUNCTION public\\.${fnName}[\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$`
      ).exec(migrationSql);
      expect(fn, fnName).not.toBeNull();
      expect(fn![1], fnName).toMatch(/has_role\(auth\.uid\(\), 'admin'\)/);
    }
  });

  it("모든 SECURITY DEFINER 함수는 search_path 를 고정한다", () => {
    const defs = migrationSql.match(/SECURITY DEFINER[\s\S]{0,200}?AS \$\$/g) ?? [];
    expect(defs.length).toBeGreaterThan(0);
    for (const d of defs) expect(d).toMatch(/SET search_path = public/);
  });
});
