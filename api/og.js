/**
 * 동적 OG 태그 — 화면정의 S7 "미리보기가 안 뜨면 공유는 사실상 죽는다"
 *
 * `/r/{id}` 요청을 이 함수가 받아, 배포된 index.html 에 유형 이름과 되찾을 시간을
 * 끼워 넣어 돌려준다. 사용자에게는 평소와 같은 SPA 가 뜨고, 크롤러는 결과별 미리보기를
 * 읽는다.
 *
 * 이미지는 유형별 사전 제작을 지향한다 (PRD D6). 유형 체계가 막 확정된 참이라
 * 지금은 브랜드 기본 이미지 한 장을 쓰고, 태그(제목·설명)만 결과별로 바꾼다.
 *
 * 나가는 정보는 요약뿐이다 — 개인 업무명은 애초에 서버에 없다.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchSummary(id) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !id) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_diagnosis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ _id: id }),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const id = url.searchParams.get("id") || url.pathname.split("/").pop();

  const origin = `https://${req.headers.host}`;
  let html;
  try {
    const shell = await fetch(`${origin}/index.html`);
    html = await shell.text();
  } catch {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(302).setHeader("Location", "/");
    return res.end();
  }

  const row = await fetchSummary(id);
  if (row) {
    const summary = row.summary || {};
    const title = `${row.type_name} — AI Life Shift`;
    const description = summary.savedRange
      ? `${summary.typeLine || ""} 되찾을 수 있는 시간 ${summary.savedRange}. 직업이 아니라 당신의 일주일을 진단합니다.`
      : "직업이 아니라, 당신의 일주일을 진단합니다.";

    html = html
      .replace(
        /<meta property="og:title"[^>]*>/,
        `<meta property="og:title" content="${escapeHtml(title)}">`
      )
      .replace(
        /<meta name="twitter:title"[^>]*>/,
        `<meta name="twitter:title" content="${escapeHtml(title)}">`
      )
      .replace(
        /<meta property="og:description"[^>]*>/,
        `<meta property="og:description" content="${escapeHtml(description)}">`
      )
      .replace(
        /<meta name="twitter:description"[^>]*>/,
        `<meta name="twitter:description" content="${escapeHtml(description)}">`
      )
      .replace(
        /<meta property="og:url"[^>]*>/,
        `<meta property="og:url" content="${escapeHtml(`${origin}/r/${id}`)}">`
      )
      .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300");
  res.status(200).send(html);
}
