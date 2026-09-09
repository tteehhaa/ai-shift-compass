import { supabase } from "@/integrations/supabase/client";

/**
 * 화면 진입 / 이탈 / 클릭 이벤트 로깅.
 *
 * 화면정의 ADM "선행 요건": 이벤트는 소급 수집이 불가능하므로 화면 코드가
 * 붙는 시점에 같이 심는다.
 *
 * 규칙
 *  · 사용자가 입력한 원문(업무명·메모)은 절대 싣지 않는다. target 은 고정 식별자만.
 *  · 실패해도 화면 동작에 영향을 주지 않는다 (fire-and-forget, 예외 삼킴).
 *  · 로그인·쿠키 없이 sessionStorage UUID 하나로 세션을 묶는다.
 */

/** 화면정의 2장 화면 목록과 1:1 */
export type Screen =
  | "S0" // 랜딩
  | "S1" // 직종 선택
  | "S2" // 업무 체크
  | "S3" // 시간 + AI 활용도
  | "S4" // 목적 선택 (A/B)
  | "S5" // 계산 중
  | "S6" // 결과
  | "S7" // 공유 + 지목
  | "S8" // 궁합
  | "S9" // 이메일 선택 구독
  | "E1" // 이탈 방지 시트
  | "ADM";

export type EventName = "screen_enter" | "screen_exit" | "click" | "complete" | "abandon";

const SESSION_KEY = "als_session_id";
const TARGET_MAX = 64;

/** 자유 텍스트가 섞여 들어오는 것을 클라이언트에서 한 번 더 막는다. */
const TARGET_PATTERN = /^[a-z0-9_.:-]{1,64}$/;

export function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    // 프라이빗 모드 등에서 storage 접근이 막히면 세션 단위 묶기를 포기한다
    return crypto.randomUUID();
  }
}

export interface TrackOptions {
  target?: string;
  diagnosisId?: string | null;
  props?: Record<string, string | number | boolean>;
}

/** 로그로 내보내도 안전한 형태인지 검사·정리한다. */
export function sanitizeTarget(target?: string): string | null {
  if (!target) return null;
  const t = target.trim().toLowerCase().slice(0, TARGET_MAX);
  return TARGET_PATTERN.test(t) ? t : null;
}

/** props 에 숫자/불리언/짧은 식별자만 남긴다. 원문 유출 방지. */
export function sanitizeProps(
  props?: Record<string, string | number | boolean>
): Record<string, string | number | boolean> {
  if (!props) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!TARGET_PATTERN.test(key)) continue;
    if (typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    } else if (typeof value === "string" && TARGET_PATTERN.test(value)) {
      out[key] = value;
    }
    // 그 외(긴 문자열·객체)는 버린다
  }
  return out;
}

export function buildEvent(eventName: EventName, screen: Screen, options: TrackOptions = {}) {
  return {
    session_id: getSessionId(),
    event_name: eventName,
    screen,
    target: sanitizeTarget(options.target),
    diagnosis_id: options.diagnosisId ?? null,
    props: sanitizeProps(options.props),
    occurred_at: new Date().toISOString(),
  };
}

let enabled = true;

/** 테스트·옵트아웃용 */
export function setAnalyticsEnabled(next: boolean) {
  enabled = next;
}

export async function track(eventName: EventName, screen: Screen, options: TrackOptions = {}) {
  if (!enabled) return;
  try {
    await supabase.from("analytics_events").insert(buildEvent(eventName, screen, options));
  } catch {
    // 로깅 실패가 진단 흐름을 막아서는 안 된다
  }
}

export const trackScreenEnter = (screen: Screen, options?: TrackOptions) =>
  track("screen_enter", screen, options);

export const trackScreenExit = (screen: Screen, options?: TrackOptions) =>
  track("screen_exit", screen, options);

export const trackClick = (screen: Screen, target: string, options?: TrackOptions) =>
  track("click", screen, { ...options, target });

export const trackComplete = (screen: Screen, options?: TrackOptions) =>
  track("complete", screen, options);

/** 결과에 도달하지 못하고 창을 닫거나 뒤로 간 경우 */
export const trackAbandon = (screen: Screen, options?: TrackOptions) =>
  track("abandon", screen, options);
