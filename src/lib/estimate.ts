/**
 * PRD 3.6 D3 — 절감량을 범위로 표시한다.
 *
 *   "주 6.5시간" → "주 5~8시간"
 *
 * 소수점은 지어낸 정밀도다. PRD 3.4 원칙 2("절감량은 추정치로 표시한다")와
 * 같은 이야기이고, 경쟁사가 퍼센트 대신 4단계 밴드를 쓰는 이유와도 같다.
 */

/**
 * 되찾을 수 있는 시간의 합산은 진단 엔진이 한다 (`diagnose()` 의 savableWeeklyHours).
 * 이 파일은 그 점추정 하나를 어떻게 **말할 것인가**만 책임진다.
 */

export interface HourRange {
  low: number;
  high: number;
  /** 범위로 말할 만큼의 값이 안 될 때 */
  belowThreshold: boolean;
}

/**
 * 점 추정치를 ±로 벌려 정수 범위로 만든다.
 * PRD 예시(6.5 → 5~8)와 같은 폭을 쓴다.
 */
export function toHourRange(hours: number): HourRange {
  if (!Number.isFinite(hours) || hours <= 0) {
    return { low: 0, high: 0, belowThreshold: true };
  }
  if (hours < 1) {
    return { low: 0, high: 1, belowThreshold: true };
  }

  const low = Math.round(hours * 0.8);
  const high = Math.round(hours * 1.25);

  // 반올림이 겹치면 최소 1시간 폭은 준다. 한 점으로 찍지 않는다.
  if (high <= low) return { low, high: low + 1, belowThreshold: false };
  return { low, high, belowThreshold: false };
}

/** 화면에 그대로 넣을 수 있는 문자열. 소수점을 만들지 않는다. */
export function formatHourRange(hours: number): string {
  const { low, high, belowThreshold } = toHourRange(hours);
  if (belowThreshold) return "주 1시간 미만";
  return `주 ${low}~${high}시간`;
}

/** 절감 시간을 "이번 주에 한 건 더" 식으로 옮긴 한 줄 (US-3). 확정 금액은 쓰지 않는다. */
export function weeklyMeaning(hours: number): string {
  const { low, belowThreshold } = toHourRange(hours);
  if (belowThreshold) return "아직 크게 줄일 구석은 안 보여요.";
  if (low >= 8) return "하루를 통째로 비울 수 있는 정도예요.";
  if (low >= 4) return "반나절이 비어요. 한 건 더 받을 수 있는 크기입니다.";
  return "한 나절은 안 되지만, 매주 쌓이면 달라지는 크기예요.";
}
