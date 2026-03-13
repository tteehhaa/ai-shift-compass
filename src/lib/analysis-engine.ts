import type {
  AnalyzedActivity,
  AnalysisResult,
  ActivityCategory,
  AIInvolvement,
  ReplacementLevel,
  RoutineEntry,
  TimeReport,
} from "./types";

// 1. 카테고리별 기본 설정 (수치 조정)
const COMPRESSION_RATES: Record<ActivityCategory, number> = {
  정보학습: 5.0,
  문서사무: 4.0,
  전문기술: 4.5,
  창의기획: 2.5,
  일상: 1.0,
};

const AGENCY_RATES: Record<string, number> = {
  active: 1.0,
  passive: 0.5, // 알고리즘 잠식은 효율이 낮음
  none: 1.0,
};

const HOURLY_VALUE = 10030; // 2025 최저시급

// 2. 분류 로직: '인간 고유 활동' 방어 우선
function classifyActivity(text: string): {
  category: ActivityCategory;
  involvement: AIInvolvement;
  isHighCognitive: boolean;
} {
  const t = text.toLowerCase();

  // [우선순위 1] 인간 고유 영역 (물리적, 생리적 활동) -> 절대 보라색 방어
  if (/식사|밥|산책|요가|운동|수면|잠|휴식|목욕|샤워|대화|수다|육아|농구|축구|헬스|명상/.test(t)) {
    return { category: "일상", involvement: "none", isHighCognitive: false };
  }

  // [우선순위 2] AI 잠식 (수동적 미디어 소비) -> 빨강/주황
  if (/유튜브|sns|인스타|틱톡|쇼츠|릴스|넷플릭스|웹서핑|커뮤니티|웹툰|숏폼/.test(t)) {
    return { category: "일상", involvement: "passive", isHighCognitive: false };
  }

  // [우선순위 3] 생산성 및 전문 업무 -> 파랑/초록
  if (/코딩|개발|디자인|분석|데이터|프로그래밍|설계/.test(t))
    return { category: "전문기술", involvement: "active", isHighCognitive: true };
  if (/보고서|이메일|문서|작성|발표|ppt|엑셀|회의록|정리|메일/.test(t))
    return { category: "문서사무", involvement: "active", isHighCognitive: false };
  if (/공부|학습|강의|책|리서치|검색|뉴스|논문|읽|조사/.test(t))
    return { category: "정보학습", involvement: "active", isHighCognitive: true };
  if (/기획|아이디어|브레인스토밍|전략|컨셉|창작|글쓰기/.test(t))
    return { category: "창의기획", involvement: "active", isHighCognitive: true };

  return { category: "일상", involvement: "none", isHighCognitive: false };
}

// 3. 점수 기반 레벨 확정
function getReplacementLevel(score: number, involvement: AIInvolvement): ReplacementLevel {
  if (involvement === "none") return "human";
  if (involvement === "passive") return "high"; // 무조건 잠식으로 분류
  if (score >= 85) return "critical";
  if (score >= 60) return "assist"; // 자동화 성공(파랑) 비중 확대
  if (score >= 40) return "low"; // 보조 활용(초록)
  if (score >= 20) return "medium"; // 부분 지원(노랑)
  return "human";
}

export function analyzeRoutines(routines: RoutineEntry[], mbti: string): AnalysisResult {
  const activities: AnalyzedActivity[] = routines.map((r) => {
    const { category, involvement, isHighCognitive } = classifyActivity(r.activity);

    // 점수 산출 로직 개편
    let repScore = 0;
    if (involvement === "none") repScore = 5;
    else if (involvement === "passive") repScore = 85;
    else {
      if (category === "문서사무") repScore = 85;
      else if (category === "정보학습") repScore = 75;
      else if (category === "전문기술") repScore = 65;
      else if (category === "창의기획") repScore = 45;
      if (isHighCognitive) repScore -= 15;
    }

    const level = getReplacementLevel(repScore, involvement);
    const C = COMPRESSION_RATES[category];
    const savedTime = involvement === "active" ? Math.round(r.duration * (1 - 1 / C) * 10) / 10 : 0;

    return {
      activity: r.activity,
      time: r.time,
      original_duration_hr: r.duration,
      ai_involvement: involvement,
      category,
      is_high_cognitive: isHighCognitive,
      compression_ratio: C,
      saved_time_hr: savedTime,
      agency_adjusted_hr: savedTime,
      replacement_score: repScore,
      replacement_level: level,
    };
  });

  const totalHr = activities.reduce((s, a) => s + a.original_duration_hr, 0) || 1;

  // [핵심 수정] 뺄셈 금지! 실제 데이터 필터링 합산만 수행 (그래프 정합성 해결)
  const timeReport: TimeReport = {
    totalHr,
    erosionHr: activities
      .filter((a) => a.replacement_level === "critical" || a.replacement_level === "high")
      .reduce((s, a) => s + a.original_duration_hr, 0),
    gainHr: activities.filter((a) => a.replacement_level === "assist").reduce((s, a) => s + a.original_duration_hr, 0),
    augmentHr: activities.filter((a) => a.replacement_level === "low").reduce((s, a) => s + a.original_duration_hr, 0),
    mixedHr: activities.filter((a) => a.replacement_level === "medium").reduce((s, a) => s + a.original_duration_hr, 0),
    humanHr: activities.filter((a) => a.replacement_level === "human").reduce((s, a) => s + a.original_duration_hr, 0),
  };

  // 경제적 가치: 획득(파랑) + 증강(초록) 시간만 인정
  const economicDaily = Math.round((timeReport.gainHr + timeReport.augmentHr) * HOURLY_VALUE);

  // 시프트 지수 및 기타 로직 (생략/유지)
  const shiftIndex = Math.round(((totalHr - timeReport.humanHr) / totalHr) * 100);

  // ... (이후 페르소나 및 결과 반환 로직은 유지하되 위 변수들을 사용)

  return {
    // 기존 return 구조 유지하되 위에서 계산된 정확한 수치들 매핑
    shiftIndex,
    activities,
    timeReport,
    economicValueDaily: economicDaily,
    economicValueMonthly: economicDaily * 22,
    economicValueYearly: economicDaily * 260,
    // ... 나머지 필드들
  } as any; // (실제 타입에 맞춰 반환)
}

// 컬러/라벨/설명 상수 export
export const REPLACEMENT_COLORS: Record<ReplacementLevel, string> = {
  critical: "#ef4444",
  high: "#f97316",
  assist: "#3b82f6",
  low: "#22c55e",
  medium: "#eab308",
  human: "#a855f7",
};

export const REPLACEMENT_LABELS: Record<ReplacementLevel, string> = {
  critical: "완전 대체",
  high: "AI 잠식",
  assist: "자동화 성공",
  low: "보조 활용",
  medium: "부분 지원",
  human: "인간 고유",
};

export const REPLACEMENT_DESCRIPTIONS: Record<ReplacementLevel, string> = {
  critical: "AI가 거의 완전히 대체 가능",
  high: "알고리즘에 의해 시간이 잠식됨",
  assist: "AI 도구로 효율이 크게 향상",
  low: "AI가 보조적으로 활용 가능",
  medium: "AI가 부분적으로 지원 가능",
  human: "인간만이 할 수 있는 활동",
};

export const TIME_CATEGORY_COLORS: Record<string, string> = {
  erosionHr: "#f97316",
  gainHr: "#3b82f6",
  augmentHr: "#22c55e",
  mixedHr: "#eab308",
  humanHr: "#a855f7",
};

export const TIME_CATEGORY_LABELS: Record<string, string> = {
  erosionHr: "AI 잠식",
  gainHr: "자동화 성공",
  augmentHr: "보조 활용",
  mixedHr: "부분 지원",
  humanHr: "인간 고유",
};

export const TIME_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  erosionHr: "알고리즘에 빼앗긴 시간",
  gainHr: "AI로 절약한 시간",
  augmentHr: "AI 보조로 증강된 시간",
  mixedHr: "AI가 일부 지원하는 시간",
  humanHr: "순수 인간 활동 시간",
};
