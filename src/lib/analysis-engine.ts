import type {
  AnalyzedActivity,
  AnalysisResult,
  ActivityCategory,
  AIInvolvement,
  ReplacementLevel,
  RoutineEntry,
  TimeReport,
} from "./types";

// 1. 카테고리별 설정
const COMPRESSION_RATES: Record<ActivityCategory, number> = {
  정보학습: 5.0,
  문서사무: 4.0,
  전문기술: 4.5,
  창의기획: 2.5,
  일상: 1.0,
};

const HOURLY_VALUE = 10030; // 2025 최저시급

// 2. 분류 로직: 인간 고유 활동 방어 최우선
function classifyActivity(text: string): {
  category: ActivityCategory;
  involvement: AIInvolvement;
  isHighCognitive: boolean;
} {
  const t = text.toLowerCase();

  // [우선순위 1] 인간 고유 영역 -> 보라색 방어
  if (/식사|밥|산책|요가|운동|수면|잠|휴식|목욕|샤워|대화|수다|육아|농구|축구|헬스|명상/.test(t)) {
    return { category: "일상", involvement: "none", isHighCognitive: false };
  }

  // [우선순위 2] AI 잠식 -> 빨강/주황
  if (/유튜브|sns|인스타|틱톡|쇼츠|릴스|넷플릭스|웹서핑|커뮤니티|웹툰|숏폼/.test(t)) {
    return { category: "일상", involvement: "passive", isHighCognitive: false };
  }

  // [우선순위 3] 생산성 업무 -> 파랑/초록
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

// 3. 대체 레벨 확정
function getReplacementLevel(score: number, involvement: AIInvolvement): ReplacementLevel {
  if (involvement === "none") return "human";
  if (involvement === "passive") return "high";
  if (score >= 85) return "critical";
  if (score >= 60) return "assist";
  if (score >= 40) return "low";
  if (score >= 20) return "medium";
  return "human";
}

// 4. MBTI 페르소나 데이터
const PERSONA_MAP: Record<string, any> = {
  INTJ: {
    name: "AI 아키텍트",
    emoji: "🏗️",
    title: "AI 시대의 전략가",
    desc: "AI 시스템을 설계하고 최적화하는 마스터.",
    compatible: "ENFP",
    compatiblePersona: "AI 탐험가",
    compatibleEmoji: "🚀",
    compatibleReason: "당신의 치밀한 설계도에 예상치 못한 창의적 변수를 더해줄 파트너입니다.",
  },
  INTP: {
    name: "AI 분석가",
    emoji: "🔬",
    title: "AI 시대의 탐구자",
    desc: "AI의 원리를 깊이 파고드는 연구자.",
    compatible: "ESFJ",
    compatiblePersona: "AI 커넥터",
    compatibleEmoji: "🤝",
    compatibleReason: "당신의 깊은 분석 결과를 사람들이 이해할 수 있는 언어로 전달해줄 파트너입니다.",
  },
  ENTJ: {
    name: "AI 커맨더",
    emoji: "⚡",
    title: "AI 시대의 지휘관",
    desc: "AI를 전략적 무기로 활용하는 리더.",
    compatible: "ISFP",
    compatiblePersona: "AI 아티스트",
    compatibleEmoji: "🎭",
    compatibleReason: "당신의 강력한 실행력에 감성과 미적 완성도를 더해줄 파트너입니다.",
  },
  ENTP: {
    name: "AI 이노베이터",
    emoji: "💡",
    title: "AI 시대의 혁신가",
    desc: "AI로 새로운 가능성을 실험하는 선구자.",
    compatible: "ISTJ",
    compatiblePersona: "AI 최적화러",
    compatibleEmoji: "⚙️",
    compatibleReason: "당신의 폭발적인 아이디어를 체계적인 결과물로 다듬어줄 파트너입니다.",
  },
  INFJ: {
    name: "AI 비저너리",
    emoji: "🔮",
    title: "AI 시대의 예언자",
    desc: "인간 중심의 기술을 추구하는 이상가.",
    compatible: "ENTP",
    compatiblePersona: "AI 이노베이터",
    compatibleEmoji: "💡",
    compatibleReason: "당신의 이상적 비전을 현실적인 혁신 전략으로 구체화해줄 파트너입니다.",
  },
  INFP: {
    name: "AI 뮤즈",
    emoji: "🎨",
    title: "AI 시대의 창작자",
    desc: "AI를 창의적 영감의 도구로 활용하는 창작자.",
    compatible: "ESTJ",
    compatiblePersona: "AI 매니저",
    compatibleEmoji: "📊",
    compatibleReason: "당신의 풍부한 상상력을 실행 가능한 프로젝트로 체계화해줄 파트너입니다.",
  },
  ENFJ: {
    name: "AI 멘토",
    emoji: "🌟",
    title: "AI 시대의 안내자",
    desc: "AI 활용법을 주변에 전파하는 가이드.",
    compatible: "INTP",
    compatiblePersona: "AI 분석가",
    compatibleEmoji: "🔬",
    compatibleReason: "당신의 리더십에 데이터 기반의 객관적 근거를 제공해줄 파트너입니다.",
  },
  ENFP: {
    name: "AI 탐험가",
    emoji: "🚀",
    title: "AI 시대의 모험가",
    desc: "다양한 AI 도구를 탐색하는 탐험가.",
    compatible: "INTJ",
    compatiblePersona: "AI 아키텍트",
    compatibleEmoji: "🏗️",
    compatibleReason: "당신의 다양한 탐험 결과를 하나의 강력한 시스템으로 설계해줄 파트너입니다.",
  },
  ISTJ: {
    name: "AI 최적화러",
    emoji: "⚙️",
    title: "AI 시대의 장인",
    desc: "AI 효율을 극대화하는 관리 전문가.",
    compatible: "ENTP",
    compatiblePersona: "AI 이노베이터",
    compatibleEmoji: "💡",
    compatibleReason: "당신의 견고한 시스템에 혁신적 돌파구를 제안해줄 파트너입니다.",
  },
  ISTP: {
    name: "AI 엔지니어",
    emoji: "🔧",
    title: "AI 시대의 기술자",
    desc: "AI 도구를 실용적으로 튜닝하는 기술자.",
    compatible: "ENFJ",
    compatiblePersona: "AI 멘토",
    compatibleEmoji: "🌟",
    compatibleReason: "당신의 뛰어난 기술력을 팀과 조직에 효과적으로 전파해줄 파트너입니다.",
  },
  ESTJ: {
    name: "AI 매니저",
    emoji: "📊",
    title: "AI 시대의 관리자",
    desc: "AI 시스템을 체계적으로 운영하는 관리자.",
    compatible: "INFP",
    compatiblePersona: "AI 뮤즈",
    compatibleEmoji: "🎨",
    compatibleReason: "당신의 체계적 관리 능력에 창의적 영감과 새로운 시각을 불어넣어줄 파트너입니다.",
  },
  ESTP: {
    name: "AI 해커",
    emoji: "🎯",
    title: "AI 시대의 실행가",
    desc: "빠르게 AI를 실전에 적용하는 행동파.",
    compatible: "INFJ",
    compatiblePersona: "AI 비저너리",
    compatibleEmoji: "🔮",
    compatibleReason: "당신의 빠른 실행력에 장기적 비전과 방향성을 제시해줄 파트너입니다.",
  },
  ISFJ: {
    name: "AI 가디언",
    emoji: "🛡️",
    title: "AI 시대의 수호자",
    desc: "안전하고 윤리적인 AI 활용을 지키는 파수꾼.",
    compatible: "ESTP",
    compatiblePersona: "AI 해커",
    compatibleEmoji: "🎯",
    compatibleReason: "당신의 신중한 검증 능력에 과감한 실행력을 더해줄 파트너입니다.",
  },
  ISFP: {
    name: "AI 아티스트",
    emoji: "🎭",
    title: "AI 시대의 예술가",
    desc: "AI로 미적 감각을 표현하는 예술가.",
    compatible: "ENTJ",
    compatiblePersona: "AI 커맨더",
    compatibleEmoji: "⚡",
    compatibleReason: "당신의 섬세한 작품을 시장에 효과적으로 런칭해줄 전략적 파트너입니다.",
  },
  ESFJ: {
    name: "AI 커넥터",
    emoji: "🤝",
    title: "AI 시대의 연결자",
    desc: "AI를 통해 사람과 사람을 잇는 허브.",
    compatible: "INTP",
    compatiblePersona: "AI 분석가",
    compatibleEmoji: "🔬",
    compatibleReason: "당신의 네트워킹 역량에 심층적 데이터 분석력을 보강해줄 파트너입니다.",
  },
  ESFP: {
    name: "AI 크리에이터",
    emoji: "🎬",
    title: "AI 시대의 엔터테이너",
    desc: "AI로 즐거운 콘텐츠를 만드는 제작자.",
    compatible: "ISTJ",
    compatiblePersona: "AI 최적화러",
    compatibleEmoji: "⚙️",
    compatibleReason: "당신의 창의적 콘텐츠 제작 과정을 효율적으로 시스템화해줄 파트너입니다.",
  },
};

export function analyzeRoutines(routines: RoutineEntry[], mbti: string): AnalysisResult {
  const activities: AnalyzedActivity[] = routines.map((r) => {
    const { category, involvement, isHighCognitive } = classifyActivity(r.activity);

    let repScore = 0;
    if (involvement === "none") repScore = 5;
    else if (involvement === "passive") repScore = 90;
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

  // [중요] 뺄셈 없는 정밀 합산
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

  const humanPercent = Math.round((timeReport.humanHr / totalHr) * 100);
  const shiftIndex = Math.round(((totalHr - timeReport.humanHr) / totalHr) * 100);
  const economicDaily = Math.round((timeReport.gainHr + timeReport.augmentHr) * HOURLY_VALUE);

  // 페르소나 정보 매칭
  const persona = PERSONA_MAP[mbti] || PERSONA_MAP["ISTJ"];

  // 웰니스 조언 로직
  const needsDetox = humanPercent < 20;
  let wellnessAdvice = `인간 고유 활동이 ${humanPercent}%로 아주 건강한 밸런스입니다!`;
  if (humanPercent < 15)
    wellnessAdvice = `보라색 구간이 ${humanPercent}%로 매우 낮습니다. 의도적인 디지털 디톡스를 권장합니다.`;
  else if (humanPercent < 30) wellnessAdvice = `AI와 인간 활동의 균형을 잘 잡고 계시네요.`;

  return {
    shiftIndex,
    persona: persona.name,
    personaEmoji: persona.emoji,
    personaDescription: persona.desc,
    personaTitle: persona.title,
    activities,
    timeReport,
    humanTimePercent: humanPercent,
    economicValueDaily: economicDaily,
    economicValueMonthly: economicDaily * 22,
    economicValueYearly: economicDaily * 260,
    percentileRank: Math.max(1, 100 - shiftIndex),
    wellnessAdvice,
    needsDetox,
    compatibleMBTI: persona.compatible,
    compatiblePersona: persona.compatiblePersona,
    oneLinerSummary: `나의 AI 시프트 지수는 ${shiftIndex}%! 당신의 일상은 안전한가요? #AI_Shift #AI_시프트`,
  };
}

// 컬러 및 설명 데이터 (기존 유지)
export const REPLACEMENT_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
  assist: "#3b82f6",
  human: "#8b5cf6",
};

export const REPLACEMENT_LABELS: Record<string, string> = {
  critical: "AI 대체 위험",
  high: "AI 잠식",
  medium: "부분 지원",
  low: "보조 활용",
  assist: "자동화 성공",
  human: "인간 고유 영역",
};

export const REPLACEMENT_DESCRIPTIONS: Record<string, string> = {
  critical: "AI로 즉시 대체 가능한 영역.",
  high: "알고리즘에 의해 잠식되고 있는 시간.",
  medium: "AI와 인간의 협업이 필요한 지대.",
  low: "인간의 판단이 핵심인 보조 영역.",
  assist: "AI를 통해 자동화에 성공한 영역.",
  human: "AI가 개입할 수 없는 가치 있는 시간.",
};

export const TIME_CATEGORY_COLORS = {
  gain: "#3b82f6",
  erosion: "#ef4444",
  augment: "#22c55e",
  mixed: "#eab308",
  human: "#8b5cf6",
};
export const TIME_CATEGORY_LABELS = {
  gain: "획득 시간",
  erosion: "잠식 시간",
  augment: "증강 시간",
  mixed: "혼재 시간",
  human: "고유 시간",
};
export const TIME_CATEGORY_DESCRIPTIONS = {
  gain: "AI로 번 시간.",
  erosion: "뺏긴 시간.",
  augment: "강해진 시간.",
  mixed: "협업한 시간.",
  human: "순수한 인간의 시간.",
};
