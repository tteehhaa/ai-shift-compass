import type { AnalyzedActivity, AnalysisResult, ActivityCategory, AIInvolvement, ReplacementLevel, RoutineEntry } from './types';

const COMPRESSION_RATES: Record<ActivityCategory, number> = {
  '정보학습': 6.0,
  '문서사무': 3.5,
  '전문기술': 4.0,
  '창의기획': 2.5,
  '일상': 1.0,
};

const AGENCY_RATES: Record<string, number> = {
  active: 1.0,
  passive: 0.70,
  none: 0.85,
};

// AI replacement potential by category (base scores)
const REPLACEMENT_BASE: Record<ActivityCategory, number> = {
  '정보학습': 75,
  '문서사무': 85,
  '전문기술': 60,
  '창의기획': 40,
  '일상': 10,
};

const HOURLY_VALUE = 19000; // KRW per hour

function classifyActivity(text: string): { category: ActivityCategory; involvement: AIInvolvement; isHighCognitive: boolean } {
  const t = text.toLowerCase();
  if (/공부|학습|강의|책|리서치|검색|뉴스|논문|읽|조사/.test(t))
    return { category: '정보학습', involvement: 'active', isHighCognitive: true };
  if (/보고서|이메일|문서|작성|발표|ppt|엑셀|회의록|정리|메일/.test(t))
    return { category: '문서사무', involvement: 'active', isHighCognitive: false };
  if (/코딩|개발|디자인|분석|데이터|프로그래밍|설계/.test(t))
    return { category: '전문기술', involvement: 'active', isHighCognitive: true };
  if (/기획|아이디어|브레인스토밍|전략|컨셉|창작|글쓰기/.test(t))
    return { category: '창의기획', involvement: 'active', isHighCognitive: true };
  if (/sns|유튜브|넷플릭스|틱톡|인스타|스크롤|숏폼/.test(t))
    return { category: '일상', involvement: 'passive', isHighCognitive: false };
  return { category: '일상', involvement: 'none', isHighCognitive: false };
}

function getReplacementLevel(score: number): ReplacementLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'low';
  return 'safe';
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

function getPersonaInfo(mbti: string) {
  return PERSONA_MAP[mbti] || PERSONA_MAP['ENTJ'];
}

export function analyzeRoutines(routines: RoutineEntry[], mbti: string): AnalysisResult {
  const activities: AnalyzedActivity[] = routines.map((r) => {
    const { category, involvement, isHighCognitive } = classifyActivity(r.activity);
    const C = COMPRESSION_RATES[category];
    const A = AGENCY_RATES[involvement];
    const E = involvement === 'none' ? 0 : 1;

    const savedTime = Math.min(r.duration * (1 - 1 / C) * E, r.duration * 0.9); // 90% cap
    const agencyAdjusted = savedTime * A;

    // Replacement score
    let repScore = REPLACEMENT_BASE[category];
    if (involvement === 'active') repScore += 10;
    if (involvement === 'passive') repScore -= 5;
    if (isHighCognitive) repScore -= 10;
    repScore = Math.max(0, Math.min(100, repScore));

    return {
      activity: r.activity,
      time: r.time,
      original_duration_min: r.duration,
      ai_involvement: involvement,
      category,
      is_high_cognitive: isHighCognitive,
      compression_ratio: C,
      saved_time_min: Math.round(savedTime * 10) / 10,
      agency_adjusted_min: Math.round(agencyAdjusted * 10) / 10,
      replacement_score: repScore,
      replacement_level: getReplacementLevel(repScore),
    };
  });

  const totalDay = activities.reduce((s, a) => s + a.original_duration_min, 0) || 1;
  const sumSavedQ = activities.reduce((s, a) => {
    const Q = a.is_high_cognitive ? 1.2 : 1.0;
    return s + a.saved_time_min * Q;
  }, 0);
  const sumPassive = activities.filter(a => a.ai_involvement === 'passive').reduce((s, a) => s + a.original_duration_min, 0);
  const shiftIndex = Math.min(Math.round(((sumSavedQ + sumPassive) / totalDay) * 100), 100);

  const humanTime = activities.filter(a => a.ai_involvement === 'none').reduce((s, a) => s + a.original_duration_min, 0);
  const humanPercent = Math.round((humanTime / totalDay) * 100);

  const totalSaved = Math.round(activities.reduce((s, a) => s + a.saved_time_min, 0));
  const erosionMin = Math.round(activities.filter(a => a.ai_involvement === 'passive').reduce((s, a) => s + a.original_duration_min, 0));
  const gainMin = Math.round(activities.filter(a => a.replacement_level !== 'safe' && a.replacement_level !== 'low').reduce((s, a) => s + a.saved_time_min, 0));

  const economicDaily = Math.round((totalSaved / 60) * HOURLY_VALUE);
  const economicMonthly = economicDaily * 22;
  const economicYearly = economicDaily * 260;

  // Simulated percentile based on shift index
  const percentile = Math.max(1, Math.min(99, 100 - Math.round(shiftIndex * 0.8 + Math.random() * 10)));

  const persona = getPersonaInfo(mbti);

  const needsDetox = humanPercent < 20;
  let wellnessAdvice = '';
  if (humanPercent < 15) {
    wellnessAdvice = `보라색(인간) 구간이 ${humanPercent}%입니다. 조금 더 오프라인의 삶이 필요해요. 디지털 디톡스를 추천합니다.`;
  } else if (humanPercent < 30) {
    wellnessAdvice = `인간 고유 활동이 ${humanPercent}%입니다. 적당한 균형을 유지하고 있어요.`;
  } else {
    wellnessAdvice = `인간 고유 활동이 ${humanPercent}%로 건강한 밸런스입니다. AI와 공존하는 멋진 라이프스타일이에요!`;
  }

  const oneLiner = `나는 오늘 AI 덕분에 ${gainMin}분을 벌었고, 알고리즘에 ${erosionMin}분을 뺏겼다. 내 삶의 AI 변화율은 ${shiftIndex}%. 너는? #AI_Shift #AI_시프트`;

  return {
    shiftIndex,
    persona: persona.name,
    personaEmoji: persona.emoji,
    personaDescription: persona.desc,
    personaTitle: persona.title,
    activities: activities.sort((a, b) => b.replacement_score - a.replacement_score),
    totalOriginalMin: totalDay,
    totalSavedMin: totalSaved,
    totalErosionMin: erosionMin,
    totalGainMin: gainMin,
    humanTimeMin: humanTime,
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

export const REPLACEMENT_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  safe: '#3b82f6',
};

export const REPLACEMENT_LABELS: Record<string, string> = {
  critical: 'AI 대체 위험',
  high: 'AI 자동화 가능',
  medium: 'AI 보조 활용',
  low: 'AI 부분 지원',
  safe: '인간 고유 영역',
};
