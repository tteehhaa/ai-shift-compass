import type { AnalyzedActivity, AnalysisResult, ActivityCategory, AIInvolvement, ReplacementLevel, RoutineEntry, TimeReport } from './types';

// ═══════════════════════════════════════════════════════════════
// Semantic Classifier — keyword-forced 3-tier classification
// ═══════════════════════════════════════════════════════════════

type SemanticGroup = 'human' | 'erosion' | 'augment';

interface ClassificationResult {
  group: SemanticGroup;
  category: ActivityCategory;
  involvement: AIInvolvement;
  isHighCognitive: boolean;
  replacementScore: number;
}

interface KeywordRule {
  keywords: string[];
  score: number;
}

interface AugmentRule extends KeywordRule {
  category: ActivityCategory;
  isHighCognitive: boolean;
  minScore: number;
  maxScore: number;
}

// 1) 인간 고유 영역 (🟣 / involvement=none 고정)
const HUMAN_RULES: KeywordRule[] = [
  { keywords: ['식사', '밥', '아침', '점심', '저녁', '간식', '야식', '수면', '잠', '낮잠', '목욕', '샤워'], score: 1 },
  { keywords: ['산책', '조깅', '러닝', '운동', '헬스', '요가', '필라테스', '스트레칭', '농구', '축구', '수영'], score: 2 },
  { keywords: ['대화', '수다', '통화', '전화', '만남', '육아', '돌봄', '가족', '친구'], score: 2 },
  { keywords: ['명상', '휴식', '기도', '그림', '독서', '책', '일기', '음악감상'], score: 3 },
];

// 2) AI 잠식/위험 (🔴/🟠 / involvement=passive 고정)
const EROSION_RULES: KeywordRule[] = [
  { keywords: ['쇼츠', '숏폼', '릴스', '틱톡', 'shorts', 'tiktok', '무한스크롤'], score: 94 },
  { keywords: ['유튜브', 'youtube', '인스타그램', '인스타', 'instagram', 'sns', 'threads', '스레드'], score: 92 },
  { keywords: ['웹서핑', '눈팅', '커뮤니티', '스크롤', '피드', '알고리즘', '추천콘텐츠', '자동재생', '멍때리기'], score: 93 },
  { keywords: ['단순게임', '모바일게임', '시간때우기', '도파민'], score: 91 },
];

// 3) AI 증강/획득 (🔵/🟢/🟡 / involvement=active 고정)
const AUGMENT_RULES: AugmentRule[] = [
  {
    keywords: ['코딩', '개발', '프로그래밍', '설계', 'api', '서버', '디버깅', '리팩토링'],
    category: '전문기술',
    isHighCognitive: true,
    score: 48,
    minScore: 42,
    maxScore: 62,
  },
  {
    keywords: ['보고서', '리포트', '이메일', '메일', '번역', '자료정리', '문서작성', '회의록'],
    category: '문서사무',
    isHighCognitive: false,
    score: 40,
    minScore: 32,
    maxScore: 50,
  },
  {
    keywords: ['리서치', '연구', '공부', '학습', '조사', '검색', '논문', '강의'],
    category: '정보학습',
    isHighCognitive: true,
    score: 44,
    minScore: 36,
    maxScore: 56,
  },
  {
    keywords: ['기획', '기획안', '아이디어', '브레인스토밍', '콘텐츠기획', '글쓰기', '포스팅'],
    category: '창의기획',
    isHighCognitive: true,
    score: 46,
    minScore: 38,
    maxScore: 58,
  },
];

function normalizeActivityText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9가-힣]/g, '');
}

function countKeywordHits(text: string, keywords: string[]): number {
  return keywords.reduce((count, keyword) => count + (text.includes(normalizeActivityText(keyword)) ? 1 : 0), 0);
}

function pickBestRule(text: string, rules: KeywordRule[]): { hitCount: number; score: number } {
  return rules.reduce(
    (best, rule) => {
      const hitCount = countKeywordHits(text, rule.keywords);
      if (hitCount > best.hitCount) {
        return { hitCount, score: rule.score };
      }
      return best;
    },
    { hitCount: 0, score: 0 },
  );
}

function pickBestAugmentRule(text: string): { hitCount: number; rule: AugmentRule | null } {
  return AUGMENT_RULES.reduce(
    (best, rule) => {
      const hitCount = countKeywordHits(text, rule.keywords);
      if (hitCount > best.hitCount) {
        return { hitCount, rule };
      }
      return best;
    },
    { hitCount: 0, rule: null as AugmentRule | null },
  );
}

function classifyActivity(text: string): ClassificationResult {
  const normalized = normalizeActivityText(text);

  const humanMatch = pickBestRule(normalized, HUMAN_RULES);
  const erosionMatch = pickBestRule(normalized, EROSION_RULES);
  const augmentMatch = pickBestAugmentRule(normalized);

  // 1순위: 신체/생리/대면 활동은 항상 인간 고유 영역으로 강제
  if (humanMatch.hitCount > 0) {
    const physicalBonusHits = countKeywordHits(normalized, ['산책', '조깅', '러닝', '운동', '헬스', '요가', '필라테스', '스트레칭', '농구', '축구', '수영']);
    const replacementScore = Math.min(5, Math.max(0, humanMatch.score + Math.max(0, humanMatch.hitCount - 1) - (physicalBonusHits > 0 ? 1 : 0)));

    return {
      group: 'human',
      category: '일상',
      involvement: 'none',
      isHighCognitive: false,
      replacementScore,
    };
  }

  // 2순위: 수동 소비형 디지털 활동은 잠식(=Stolen Time)으로 강제
  if (erosionMatch.hitCount > 0) {
    const intensityHits = countKeywordHits(normalized, ['쇼츠', '숏폼', '릴스', '무한스크롤', '도파민', '알고리즘', '자동재생']);
    const replacementScore = Math.min(100, Math.max(90, erosionMatch.score + Math.max(0, erosionMatch.hitCount - 1) * 2 + intensityHits));

    return {
      group: 'erosion',
      category: '일상',
      involvement: 'passive',
      isHighCognitive: false,
      replacementScore,
    };
  }

  // 3순위: 생산형 디지털 활동은 증강/획득으로 분류
  if (augmentMatch.hitCount > 0) {
    const rule = augmentMatch.rule ?? AUGMENT_RULES[0];
    const productivityHints = countKeywordHits(normalized, ['작성', '정리', '분석', '개발', '설계', '학습', '연구', '기획', '번역', '디버깅']);
    const dynamicScore = Math.min(
      rule.maxScore,
      Math.max(rule.minScore, rule.score + Math.max(0, augmentMatch.hitCount - 1) * 3 + Math.min(productivityHints, 2) * 2),
    );

    return {
      group: 'augment',
      category: rule.category,
      involvement: 'active',
      isHighCognitive: rule.isHighCognitive,
      replacementScore: dynamicScore,
    };
  }

  return {
    group: 'human',
    category: '일상',
    involvement: 'none',
    isHighCognitive: false,
    replacementScore: 5,
  };
}

// ═══════════════════════════════════════════════════════════════

const COMPRESSION_RATES: Record<ActivityCategory, number> = {
  '정보학습': 6.0,
  '문서사무': 3.5,
  '전문기술': 4.0,
  '창의기획': 2.5,
  '일상': 1.0,
};

const HOURLY_VALUE = 10030; // 2025 최저시급

function getReplacementLevel(score: number): ReplacementLevel {
  if (score >= 85) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  if (score >= 30) return 'low';
  if (score >= 15) return 'assist';
  return 'human';
}

const PERSONA_MAP: Record<string, { name: string; emoji: string; title: string; desc: string; compatible: string; compatiblePersona: string }> = {
  INTJ: { name: 'AI 아키텍트', emoji: '🏗️', title: 'AI 시대의 전략가', desc: 'AI 시스템을 설계하고 최적화하는 마스터. 데이터 기반 의사결정의 달인.', compatible: 'ENFP', compatiblePersona: 'AI 뮤즈' },
  INTP: { name: 'AI 분석가', emoji: '🔬', title: 'AI 시대의 탐구자', desc: 'AI의 원리를 깊이 파고들며 새로운 활용법을 발견하는 유형.', compatible: 'ENTJ', compatiblePersona: 'AI 커맨더' },
  ENTJ: { name: 'AI 커맨더', emoji: '⚡', title: 'AI 시대의 지휘관', desc: 'AI를 전략적 무기로 활용해 팀과 프로젝트를 이끄는 리더.', compatible: 'INFP', compatiblePersona: 'AI 뮤즈' },
  ENTP: { name: 'AI 이노베이터', emoji: '💡', title: 'AI 시대의 혁신가', desc: '기존 틀을 깨고 AI로 새로운 가능성을 실험하는 선구자.', compatible: 'ISFJ', compatiblePersona: 'AI 가디언' },
  INFJ: { name: 'AI 비저너리', emoji: '🔮', title: 'AI 시대의 예언자', desc: 'AI의 윤리적 활용과 인간 중심 기술을 추구하는 이상가.', compatible: 'ESTP', compatiblePersona: 'AI 해커' },
  INFP: { name: 'AI 뮤즈', emoji: '🎨', title: 'AI 시대의 창작자', desc: 'AI를 창의적 영감의 도구로 활용하며 독창적 콘텐츠를 만드는 유형.', compatible: 'ENTJ', compatiblePersona: 'AI 커맨더' },
  ENFJ: { name: 'AI 멘토', emoji: '🌟', title: 'AI 시대의 안내자', desc: 'AI 활용법을 주변에 전파하며 함께 성장하는 것을 즐기는 유형.', compatible: 'ISTP', compatiblePersona: 'AI 엔지니어' },
  ENFP: { name: 'AI 탐험가', emoji: '🚀', title: 'AI 시대의 모험가', desc: '다양한 AI 도구를 탐색하며 가능성의 경계를 넓히는 유형.', compatible: 'INTJ', compatiblePersona: 'AI 아키텍트' },
  ISTJ: { name: 'AI 최적화러', emoji: '⚙️', title: 'AI 시대의 장인', desc: 'AI 워크플로우를 체계적으로 구축하고 효율을 극대화하는 유형.', compatible: 'ESFP', compatiblePersona: 'AI 크리에이터' },
  ISTP: { name: 'AI 엔지니어', emoji: '🔧', title: 'AI 시대의 기술자', desc: 'AI 도구의 내부를 이해하고 실용적으로 커스터마이징하는 유형.', compatible: 'ENFJ', compatiblePersona: 'AI 멘토' },
  ESTJ: { name: 'AI 매니저', emoji: '📊', title: 'AI 시대의 관리자', desc: 'AI를 조직의 생산성 도구로 체계적으로 도입하고 관리하는 유형.', compatible: 'ISFP', compatiblePersona: 'AI 아티스트' },
  ESTP: { name: 'AI 해커', emoji: '🎯', title: 'AI 시대의 실행가', desc: '빠르게 AI를 실전에 적용하고 결과를 내는 행동파.', compatible: 'INFJ', compatiblePersona: 'AI 비저너리' },
  ISFJ: { name: 'AI 가디언', emoji: '🛡️', title: 'AI 시대의 수호자', desc: 'AI의 안전한 활용을 추구하며 데이터 보안에 신경 쓰는 유형.', compatible: 'ENTP', compatiblePersona: 'AI 이노베이터' },
  ISFP: { name: 'AI 아티스트', emoji: '🎭', title: 'AI 시대의 예술가', desc: 'AI를 감성적 표현의 도구로 활용하며 아름다움을 추구하는 유형.', compatible: 'ESTJ', compatiblePersona: 'AI 매니저' },
  ESFJ: { name: 'AI 커넥터', emoji: '🤝', title: 'AI 시대의 연결자', desc: 'AI로 사람들을 연결하고 커뮤니티를 활성화하는 유형.', compatible: 'INTP', compatiblePersona: 'AI 분석가' },
  ESFP: { name: 'AI 크리에이터', emoji: '🎬', title: 'AI 시대의 엔터테이너', desc: 'AI를 활용해 매력적인 콘텐츠를 생산하는 유형.', compatible: 'ISTJ', compatiblePersona: 'AI 최적화러' },
};

const UNKNOWN_PERSONAS = [
  { name: 'AI 탐험가', emoji: '🧭', title: 'AI 시대의 자유인', desc: 'AI를 능동적으로 탐색하며 자신만의 활용법을 개척하는 유형. 호기심과 실험 정신으로 가득합니다.', compatible: 'INTJ', compatiblePersona: 'AI 아키텍트', minActiveRatio: 0.5 },
  { name: '디지털 노마드', emoji: '🌍', title: 'AI 시대의 유목민', desc: 'AI와 자연스럽게 공존하며 유연하게 적응하는 유형. 변화를 두려워하지 않는 여행자 같은 마인드.', compatible: 'ENFP', compatiblePersona: 'AI 탐험가', minActiveRatio: 0 },
];

function getPersonaInfo(mbti: string, activeRatio?: number) {
  if (mbti === 'UNKNOWN') {
    const ratio = activeRatio ?? 0.5;
    return ratio >= 0.5 ? UNKNOWN_PERSONAS[0] : UNKNOWN_PERSONAS[1];
  }
  return PERSONA_MAP[mbti] || UNKNOWN_PERSONAS[0];
}

// ═══════════════════════════════════════════════════════════════
// Main Analysis Engine
// ═══════════════════════════════════════════════════════════════

export function analyzeRoutines(routines: RoutineEntry[], mbti: string): AnalysisResult {
  const activities: AnalyzedActivity[] = routines.map((r) => {
    const cls = classifyActivity(r.activity);
    const C = cls.group === 'augment' ? COMPRESSION_RATES[cls.category] : 1;

    const savedTime = cls.group === 'augment'
      ? Math.min(r.duration * (1 - 1 / C), r.duration * 0.9)
      : 0;

    return {
      activity: r.activity,
      time: r.time,
      original_duration_hr: r.duration,
      ai_involvement: cls.involvement,
      category: cls.category,
      is_high_cognitive: cls.isHighCognitive,
      compression_ratio: C,
      saved_time_hr: Math.round(savedTime * 100) / 100,
      agency_adjusted_hr: Math.round(savedTime * 100) / 100,
      replacement_score: Math.round(cls.replacementScore),
      replacement_level: getReplacementLevel(cls.replacementScore),
    };
  });

  const totalHr = activities.reduce((sum, activity) => sum + activity.original_duration_hr, 0);
  const safeTotalHr = totalHr || 1;
  const round2 = (value: number) => Math.round(value * 100) / 100;
  const round2Safe = (value: number) => {
    const rounded = round2(value);
    return Math.abs(rounded) < 0.005 ? 0 : rounded;
  };

  // replacement_level(=테이블 배지 색상) 기준으로만 실제 시간 합산
  const durationByLevel: Record<ReplacementLevel, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    assist: 0,
    human: 0,
  };

  activities.forEach((activity) => {
    durationByLevel[activity.replacement_level] += activity.original_duration_hr;
  });

  const timeReport: TimeReport = {
    totalHr: round2Safe(totalHr),
    gainHr: round2Safe(durationByLevel.assist),
    erosionHr: round2Safe(durationByLevel.critical + durationByLevel.high),
    augmentHr: round2Safe(durationByLevel.low),
    mixedHr: round2Safe(durationByLevel.medium),
    humanHr: round2Safe(durationByLevel.human),
  };

  // Shift index
  const sumSavedQ = activities.reduce((sum, activity) => {
    const qualityWeight = activity.is_high_cognitive ? 1.2 : 1.0;
    return sum + activity.saved_time_hr * qualityWeight;
  }, 0);
  const sumPassive = activities
    .filter((activity) => activity.ai_involvement === 'passive')
    .reduce((sum, activity) => sum + activity.original_duration_hr, 0);
  const shiftIndex = Math.min(Math.round(((sumSavedQ + sumPassive) / safeTotalHr) * 100), 100);

  const humanPercent = totalHr > 0 ? Math.round((timeReport.humanHr / safeTotalHr) * 100) : 0;

  // Economic value: 파랑/초록(assist/low)으로 실제 절약된 시간만 가치로 인정
  const valueSavedHr = activities
    .filter((activity) => activity.ai_involvement === 'active' && (activity.replacement_level === 'assist' || activity.replacement_level === 'low'))
    .reduce((sum, activity) => sum + activity.saved_time_hr, 0);
  const economicDaily = Math.round(valueSavedHr * HOURLY_VALUE);
  const economicMonthly = economicDaily * 22;
  const economicYearly = economicDaily * 260;

  const percentile = Math.max(1, Math.min(99, 100 - Math.round(shiftIndex * 0.8 + Math.random() * 10)));

  const activeCount = activities.filter((activity) => activity.ai_involvement === 'active').length;
  const activeRatio = activities.length > 0 ? activeCount / activities.length : 0.5;
  const persona = getPersonaInfo(mbti, activeRatio);

  const needsDetox = humanPercent < 20;
  let wellnessAdvice = '';
  if (humanPercent < 15) {
    wellnessAdvice = `보라색 구간(인간만이 할 수 있는 영역)이 ${humanPercent}%입니다. 조금 더 오프라인의 삶이 필요해요. 디지털 디톡스를 추천합니다.`;
  } else if (humanPercent < 30) {
    wellnessAdvice = `인간 고유 활동이 ${humanPercent}%입니다. 적당한 균형을 유지하고 있어요.`;
  } else {
    wellnessAdvice = `인간 고유 활동이 ${humanPercent}%로 건강한 밸런스입니다. AI와 공존하는 멋진 라이프스타일이에요!`;
  }

  const oneLiner = `나는 오늘 AI 덕분에 ${Math.round(valueSavedHr)}시간을 벌었고, 알고리즘에 ${Math.round(timeReport.erosionHr)}시간을 뺏겼다. 내 삶의 AI 변화율은 ${shiftIndex}%. 너는? #AI_Shift #AI_시프트`;

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
    economicValueMonthly: economicMonthly,
    economicValueYearly: economicYearly,
    percentileRank: percentile,
    wellnessAdvice,
    needsDetox,
    compatibleMBTI: persona.compatible,
    compatiblePersona: persona.compatiblePersona,
    oneLinerSummary: oneLiner,
  };
}

// 6-level rainbow replacement colors (빨→주→노→초→파→보)
export const REPLACEMENT_COLORS: Record<string, string> = {
  critical: '#ef4444', // 빨강 - AI 대체 위험
  high:     '#f97316', // 주황 - AI 잠식
  medium:   '#eab308', // 노랑 - 부분 지원
  low:      '#22c55e', // 초록 - 보조 활용
  assist:   '#3b82f6', // 파랑 - 자동화 성공
  human:    '#8b5cf6', // 보라 - 인간 고유
};

export const REPLACEMENT_LABELS: Record<string, string> = {
  critical: 'AI 대체 위험',
  high:     'AI 잠식',
  medium:   '부분 지원',
  low:      '보조 활용',
  assist:   '자동화 성공',
  human:    '인간 고유 영역',
};

export const REPLACEMENT_DESCRIPTIONS: Record<string, string> = {
  critical: '90% 이상의 과업이 AI로 즉시 대체 가능한 영역.',
  high:     'AI 알고리즘에 의해 점차 잠식되고 있는 영역.',
  medium:   'AI와 인간의 협업이 필수적인 회색 지대.',
  low:      'AI의 부분적 보조만 가능하며 인간의 판단이 핵심인 영역.',
  assist:   'AI를 도구로 활용해 성공적으로 자동화된 영역.',
  human:    '정서적 교감, 신체 활동 등 AI가 개입할 수 없는 가치 있는 시간.',
};

// Time report colors — badge 색상과 1:1 매핑
export const TIME_CATEGORY_COLORS: Record<string, string> = {
  gain:    '#3b82f6', // 파랑 (= assist)
  erosion: '#f97316', // 주황 (= high)
  augment: '#22c55e', // 초록 (= low)
  mixed:   '#eab308', // 노랑 (= medium)
  human:   '#8b5cf6', // 보라 (= human)
};

export const TIME_CATEGORY_LABELS: Record<string, string> = {
  gain:    '획득 시간',
  erosion: '잠식 시간',
  augment: '증강 시간',
  mixed:   '혼재 시간',
  human:   '고유 시간',
};

export const TIME_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  gain:    'AI 활용으로 단축되어 자유롭게 쓸 수 있게 된 시간.',
  erosion: '알고리즘 노출로 인해 의도치 않게 소모된 시간.',
  augment: 'AI를 도구로 사용하여 능력치가 높아진 시간.',
  mixed:   'AI와 인간의 협업이 필수적인 시간.',
  human:   'AI 개입 0%의 순수한 인간 활동 시간.',
};
