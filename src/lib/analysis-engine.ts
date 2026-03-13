import type { AnalyzedActivity, AnalysisResult, ActivityCategory, AIInvolvement, ReplacementLevel, RoutineEntry, TimeReport } from './types';

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

const REPLACEMENT_BASE: Record<ActivityCategory, number> = {
  '정보학습': 75,
  '문서사무': 85,
  '전문기술': 60,
  '창의기획': 40,
  '일상': 10,
};

const HOURLY_VALUE = 10030; // 2025 최저시급

// ── 1) 인간 고유 영역 (보라 / 대체율 0-10%) ──
const HUMAN_ONLY_KEYWORDS = /식사|밥|산책|운동|요가|수면|잠|목욕|샤워|대화|농구|축구|육아|명상|휴식|낮잠|스트레칭|조깅|등산|자전거|필라테스|헬스|수영|독서|일기|저녁|아침|점심|간식|커피|차|티타임|친구|가족|놀이/;

// ── 2) AI 잠식/위험 (빨강·주황 / 위험도 80-100%) ──
const AI_EROSION_KEYWORDS = /유튜브|쇼츠|숏폼|인스타그램|인스타|틱톡|넷플릭스|웹서핑|sns|스크롤|트위터|페이스북|레딧|웹툰|게임|릴스|핀터레스트|쿠팡|쇼핑|알고리즘/;

// ── 3) AI 증강/획득 (파랑·초록 / 대체율 50-90%) ──
const AI_AUGMENT_KEYWORDS = /보고서|코딩|개발|이메일|메일|리서치|자료\s?정리|번역|기획안|작성|ppt|엑셀|문서|회의록|발표|정리|데이터|분석|프로그래밍|설계|디자인|검색|공부|학습|강의|논문|조사|전략|컨셉|브레인스토밍|아이디어|창작|글쓰기/;

function classifyActivity(text: string): { category: ActivityCategory; involvement: AIInvolvement; isHighCognitive: boolean; forcedReplacementScore?: number } {
  const t = text.toLowerCase();

  // Priority 1: 인간 고유 — involvement=none, 대체율 5%
  if (HUMAN_ONLY_KEYWORDS.test(t))
    return { category: '일상', involvement: 'none', isHighCognitive: false, forcedReplacementScore: 5 };

  // Priority 2: AI 잠식 — involvement=passive, stolen_time (대체율 90%)
  if (AI_EROSION_KEYWORDS.test(t))
    return { category: '일상', involvement: 'passive', isHighCognitive: false, forcedReplacementScore: 90 };

  // Priority 3: AI 증강/획득 — involvement=active
  if (AI_AUGMENT_KEYWORDS.test(t)) {
    // Sub-classify
    if (/코딩|개발|프로그래밍|설계|디자인|분석|데이터/.test(t))
      return { category: '전문기술', involvement: 'active', isHighCognitive: true };
    if (/기획|아이디어|브레인스토밍|전략|컨셉|창작|글쓰기/.test(t))
      return { category: '창의기획', involvement: 'active', isHighCognitive: true };
    if (/공부|학습|강의|논문|조사|리서치|검색/.test(t))
      return { category: '정보학습', involvement: 'active', isHighCognitive: true };
    return { category: '문서사무', involvement: 'active', isHighCognitive: false };
  }

  // Fallback: 인간 고유
  return { category: '일상', involvement: 'none', isHighCognitive: false, forcedReplacementScore: 5 };
}

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

export function analyzeRoutines(routines: RoutineEntry[], mbti: string): AnalysisResult {
  const activities: AnalyzedActivity[] = routines.map((r) => {
    const { category, involvement, isHighCognitive, forcedReplacementScore } = classifyActivity(r.activity);
    const C = COMPRESSION_RATES[category];
    const A = AGENCY_RATES[involvement];

    let savedTime: number;
    if (involvement === 'passive') {
      // AI 잠식: stolen_time — 전체 시간이 빼앗긴 시간
      savedTime = 0; // 획득 없음, 잠식만 있음
    } else if (involvement === 'none') {
      // 인간 고유: AI 개입 없음
      savedTime = 0;
    } else {
      // AI 증강/획득: 압축으로 절약
      savedTime = Math.min(r.duration * (1 - 1 / C), r.duration * 0.9);
    }
    const agencyAdjusted = savedTime * A;

    let repScore: number;
    if (forcedReplacementScore !== undefined) {
      repScore = forcedReplacementScore;
    } else {
      repScore = REPLACEMENT_BASE[category];
      if (involvement === 'active') repScore += 10;
      if (involvement === 'passive') repScore -= 5;
      if (isHighCognitive) repScore -= 10;
      repScore = Math.max(0, Math.min(100, repScore));
    }

    return {
      activity: r.activity,
      time: r.time,
      original_duration_hr: r.duration,
      ai_involvement: involvement,
      category,
      is_high_cognitive: isHighCognitive,
      compression_ratio: C,
      saved_time_hr: Math.round(savedTime),
      agency_adjusted_hr: Math.round(agencyAdjusted),
      replacement_score: repScore,
      replacement_level: getReplacementLevel(repScore),
    };
  });

  const totalHr = activities.reduce((s, a) => s + a.original_duration_hr, 0) || 1;

  // 5-category time report
  const gainHr = Math.round(activities
    .filter(a => a.ai_involvement === 'active' && (a.replacement_level === 'critical' || a.replacement_level === 'high'))
    .reduce((s, a) => s + a.saved_time_hr, 0));
  const erosionHr = Math.round(activities
    .filter(a => a.ai_involvement === 'passive')
    .reduce((s, a) => s + a.original_duration_hr, 0));
  const augmentHr = Math.round(activities
    .filter(a => a.ai_involvement === 'active' && (a.replacement_level === 'medium' || a.replacement_level === 'low'))
    .reduce((s, a) => s + a.agency_adjusted_hr, 0));
  const humanHr = Math.round(activities
    .filter(a => a.replacement_level === 'human' || a.ai_involvement === 'none')
    .reduce((s, a) => s + a.original_duration_hr, 0));
  const mixedHr = Math.max(0, Math.round(totalHr - gainHr - erosionHr - augmentHr - humanHr));

  const timeReport: TimeReport = { totalHr, gainHr, erosionHr, augmentHr, mixedHr, humanHr };

  const sumSavedQ = activities.reduce((s, a) => {
    const Q = a.is_high_cognitive ? 1.2 : 1.0;
    return s + a.saved_time_hr * Q;
  }, 0);
  const sumPassive = activities.filter(a => a.ai_involvement === 'passive').reduce((s, a) => s + a.original_duration_hr, 0);
  const shiftIndex = Math.min(Math.round(((sumSavedQ + sumPassive) / totalHr) * 100), 100);

  const humanPercent = Math.round((humanHr / totalHr) * 100);

  // Economic value: (획득 + 증강 + 대체위험 시간) × 10,030원
  const criticalHr = Math.round(activities
    .filter(a => a.replacement_level === 'critical' || a.replacement_level === 'high')
    .reduce((s, a) => s + a.original_duration_hr, 0));
  const totalAutomatableHr = gainHr + augmentHr + criticalHr;
  const economicDaily = Math.round(totalAutomatableHr * HOURLY_VALUE);
  const economicMonthly = economicDaily * 22;
  const economicYearly = economicDaily * 260;

  const percentile = Math.max(1, Math.min(99, 100 - Math.round(shiftIndex * 0.8 + Math.random() * 10)));

  const activeCount = activities.filter(a => a.ai_involvement === 'active').length;
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

  const oneLiner = `나는 오늘 AI 덕분에 ${gainHr}시간을 벌었고, 알고리즘에 ${erosionHr}시간을 뺏겼다. 내 삶의 AI 변화율은 ${shiftIndex}%. 너는? #AI_Shift #AI_시프트`;

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

// Time report colors — 동일 색상 코드 사용
export const TIME_CATEGORY_COLORS: Record<string, string> = {
  gain:    '#3b82f6', // 파랑 (= assist)
  erosion: '#ef4444', // 빨강 (= critical)
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
