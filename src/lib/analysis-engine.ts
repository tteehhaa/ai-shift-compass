import type { AnalyzedActivity, AnalysisResult, ActivityCategory, AIInvolvement, ReplacementLevel, RoutineEntry, TimeReport } from './types';

// ═══════════════════════════════════════════════════════════════
// Semantic Classifier — 3-tier activity classification
// ═══════════════════════════════════════════════════════════════

type SemanticGroup = 'human' | 'erosion' | 'augment';

interface ClassificationResult {
  group: SemanticGroup;
  category: ActivityCategory;
  involvement: AIInvolvement;
  isHighCognitive: boolean;
  /** 범위 내 유연 대체율 */
  replacementScore: number;
}

// ── 1) 인간 고유 영역 (🟣 보라 / 0~10%) ──
// 생리적 현상, 신체 활동, 대면 소통, 예술·명상 전체
const HUMAN_PATTERNS: { regex: RegExp; score: number }[] = [
  // 생리적: 0~3%
  { regex: /식사|밥|먹|아침\s?식사|점심\s?식사|저녁\s?식사|간식|야식|수면|잠|낮잠|잠들|기상|일어나|세수|양치|샤워|목욕|화장실/, score: 2 },
  // 신체 활동: 3~8%
  { regex: /산책|조깅|달리기|러닝|운동|헬스|웨이트|필라테스|요가|스트레칭|등산|하이킹|자전거|수영|농구|축구|배드민턴|탁구|테니스|골프|클라이밍|댄스|춤/, score: 5 },
  // 대면 소통: 2~6%
  { regex: /대화|수다|잡담|통화|전화|만남|모임|회식|데이트|육아|돌봄|아이|아기|가족|친구|동료|면담/, score: 4 },
  // 예술·명상·휴식: 3~8%
  { regex: /명상|기도|묵상|휴식|쉬|낮잠|그림|그리기|악기|피아노|기타|노래|음악\s?감상|독서|읽기|책|일기|저널|손글씨|뜨개질|요리|베이킹|정원|화분|반려|산림욕/, score: 6 },
  // 일반 생활: 5%
  { regex: /커피|차|티타임|카페|놀이|산보|드라이브|여행|관광|공원/, score: 5 },
];

// ── 2) AI 잠식/위험 (🔴 빨강·주황 / 80~100%) ──
// 알고리즘 기반 수동적 미디어 소비, 시간 때우기용 디지털 활동
const EROSION_PATTERNS: { regex: RegExp; score: number }[] = [
  // 숏폼/추천 알고리즘 콘텐츠: 90~100%
  { regex: /쇼츠|숏폼|릴스|틱톡|shorts/, score: 95 },
  // 장시간 스트리밍: 85~95%
  { regex: /유튜브|youtube|넷플릭스|netflix|왓챠|디즈니\+?|웨이브|티빙/, score: 88 },
  // SNS 피드: 85~95%
  { regex: /인스타그램|인스타|instagram|페이스북|facebook|트위터|twitter|x\.com|스레드|threads/, score: 90 },
  // 커뮤니티 눈팅: 80~90%
  { regex: /레딧|reddit|디시|디씨|루리웹|에펨코리아|더쿠|뽐뿌|클리앙|눈팅|커뮤니티/, score: 83 },
  // 웹서핑/스크롤: 80~88%
  { regex: /웹서핑|스크롤|멍하니|sns|소셜|피드/, score: 82 },
  // 모바일 게임/캐주얼: 80~85%
  { regex: /게임|겜|롤|lol|배그|모바일\s?게임|가챠/, score: 82 },
  // 온라인 쇼핑(충동): 80~85%
  { regex: /쿠팡|쇼핑|네이버\s?쇼핑|장바구니|윈도우\s?쇼핑|알리|테무/, score: 80 },
  // 웹툰: 82~88%
  { regex: /웹툰|웹소설|만화/, score: 85 },
  // 알고리즘 추천: 90%
  { regex: /알고리즘|추천\s?영상|자동\s?재생|autoplay/, score: 92 },
];

// ── 3) AI 증강/획득 (🔵 파랑·초록 / 50~90%) ──
// 디지털 도구 기반 생산적 업무·학습·연구
interface AugmentPattern {
  regex: RegExp;
  category: ActivityCategory;
  isHighCognitive: boolean;
  score: number; // 기본 대체율
}

const AUGMENT_PATTERNS: AugmentPattern[] = [
  // 전문기술 (60~75%)
  { regex: /코딩|개발|프로그래밍|설계|소프트웨어|앱\s?개발|백엔드|프론트엔드|풀스택|api|서버/, category: '전문기술', isHighCognitive: true, score: 70 },
  { regex: /데이터\s?분석|데이터\s?사이언스|머신러닝|딥러닝|통계|시각화|대시보드/, category: '전문기술', isHighCognitive: true, score: 65 },
  { regex: /디자인|ui|ux|피그마|figma|포토샵|일러스트|캔바|canva/, category: '전문기술', isHighCognitive: true, score: 60 },
  // 문서사무 (75~90%)
  { regex: /보고서|리포트|문서|작성|ppt|파워포인트|프레젠테이션|슬라이드/, category: '문서사무', isHighCognitive: false, score: 85 },
  { regex: /이메일|메일|email|답장|회신/, category: '문서사무', isHighCognitive: false, score: 88 },
  { regex: /엑셀|스프레드시트|표\s?정리|수식|피벗/, category: '문서사무', isHighCognitive: false, score: 82 },
  { regex: /회의록|미팅\s?노트|의사록|정리|요약/, category: '문서사무', isHighCognitive: false, score: 80 },
  { regex: /번역|통역|영작|영어\s?작성/, category: '문서사무', isHighCognitive: false, score: 90 },
  { regex: /발표\s?준비|발표\s?자료/, category: '문서사무', isHighCognitive: false, score: 78 },
  // 정보학습 (65~80%)
  { regex: /공부|학습|스터디|수업|강의|강좌|인강|온라인\s?강의/, category: '정보학습', isHighCognitive: true, score: 72 },
  { regex: /리서치|연구|조사|검색|자료\s?조사|논문|학술/, category: '정보학습', isHighCognitive: true, score: 75 },
  { regex: /자료\s?정리|노트\s?정리|메모\s?정리/, category: '정보학습', isHighCognitive: true, score: 70 },
  { regex: /뉴스|시사|기사\s?읽/, category: '정보학습', isHighCognitive: true, score: 68 },
  // 창의기획 (50~65%)
  { regex: /기획|기획안|전략|컨셉|콘셉트|비즈니스\s?모델/, category: '창의기획', isHighCognitive: true, score: 55 },
  { regex: /아이디어|브레인스토밍|마인드맵/, category: '창의기획', isHighCognitive: true, score: 50 },
  { regex: /창작|글쓰기|블로그|포스팅|콘텐츠\s?제작|영상\s?편집|편집/, category: '창의기획', isHighCognitive: true, score: 58 },
  { regex: /마케팅|광고|카피|홍보|sns\s?관리|콘텐츠\s?기획/, category: '창의기획', isHighCognitive: true, score: 62 },
];

// ── Semantic Classifier ──
function classifyActivity(text: string): ClassificationResult {
  const t = text.toLowerCase().trim();

  // Priority 1: 인간 고유 영역
  for (const pattern of HUMAN_PATTERNS) {
    if (pattern.regex.test(t)) {
      return { group: 'human', category: '일상', involvement: 'none', isHighCognitive: false, replacementScore: pattern.score };
    }
  }

  // Priority 2: AI 잠식/위험
  for (const pattern of EROSION_PATTERNS) {
    if (pattern.regex.test(t)) {
      return { group: 'erosion', category: '일상', involvement: 'passive', isHighCognitive: false, replacementScore: pattern.score };
    }
  }

  // Priority 3: AI 증강/획득
  for (const pattern of AUGMENT_PATTERNS) {
    if (pattern.regex.test(t)) {
      return { group: 'augment', category: pattern.category, involvement: 'active', isHighCognitive: pattern.isHighCognitive, replacementScore: pattern.score };
    }
  }

  // Fallback: 인간 고유 (분류 불가 → 안전하게 인간 영역)
  return { group: 'human', category: '일상', involvement: 'none', isHighCognitive: false, replacementScore: 5 };
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
    const C = COMPRESSION_RATES[cls.category];

    let savedTime: number;
    if (cls.group === 'erosion') {
      // AI 잠식: stolen_time — 획득 없음, 시간을 빼앗김
      savedTime = 0;
    } else if (cls.group === 'human') {
      // 인간 고유: AI 개입 없음
      savedTime = 0;
    } else {
      // AI 증강/획득: 압축으로 절약
      savedTime = Math.min(r.duration * (1 - 1 / C), r.duration * 0.9);
    }

    return {
      activity: r.activity,
      time: r.time,
      original_duration_hr: r.duration,
      ai_involvement: cls.involvement,
      category: cls.category,
      is_high_cognitive: cls.isHighCognitive,
      compression_ratio: C,
      saved_time_hr: Math.round(savedTime),
      agency_adjusted_hr: Math.round(savedTime), // 1:1 (agency rate 제거 — 유연 대체율로 대체)
      replacement_score: cls.replacementScore,
      replacement_level: getReplacementLevel(cls.replacementScore),
    };
  });

  const totalHr = activities.reduce((s, a) => s + a.original_duration_hr, 0) || 1;

  // ── 5-category time report (strictly from actual data sums) ──
  const erosionHr = activities
    .filter(a => a.ai_involvement === 'passive')
    .reduce((s, a) => s + a.original_duration_hr, 0);
  const humanHr = activities
    .filter(a => a.ai_involvement === 'none')
    .reduce((s, a) => s + a.original_duration_hr, 0);
  const gainHr = activities
    .filter(a => a.ai_involvement === 'active')
    .reduce((s, a) => s + a.saved_time_hr, 0);
  const augmentHr = activities
    .filter(a => a.ai_involvement === 'active')
    .reduce((s, a) => s + (a.original_duration_hr - a.saved_time_hr), 0);
  const mixedHr = Math.max(0, Math.round(totalHr - erosionHr - humanHr - gainHr - augmentHr));

  const timeReport: TimeReport = {
    totalHr: Math.round(totalHr),
    gainHr: Math.round(gainHr),
    erosionHr: Math.round(erosionHr),
    augmentHr: Math.round(augmentHr),
    mixedHr,
    humanHr: Math.round(humanHr),
  };

  // Shift index
  const sumSavedQ = activities.reduce((s, a) => {
    const Q = a.is_high_cognitive ? 1.2 : 1.0;
    return s + a.saved_time_hr * Q;
  }, 0);
  const sumPassive = activities.filter(a => a.ai_involvement === 'passive').reduce((s, a) => s + a.original_duration_hr, 0);
  const shiftIndex = Math.min(Math.round(((sumSavedQ + sumPassive) / totalHr) * 100), 100);

  const humanPercent = Math.round((timeReport.humanHr / totalHr) * 100);

  // Economic value: (획득 + 증강) × 10,030원
  // ⚠️ 잠식 시간은 경제적 가치에서 제외 (stolen time = 마이너스)
  const positiveHr = timeReport.gainHr + timeReport.augmentHr;
  const economicDaily = Math.round(positiveHr * HOURLY_VALUE);
  const economicMonthly = economicDaily * 22;
  const economicYearly = economicDaily * 260;

  // 잠식 손실 (참고 정보)
  const erosionLossDaily = Math.round(timeReport.erosionHr * HOURLY_VALUE);

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

  const oneLiner = `나는 오늘 AI 덕분에 ${timeReport.gainHr}시간을 벌었고, 알고리즘에 ${timeReport.erosionHr}시간을 뺏겼다. 내 삶의 AI 변화율은 ${shiftIndex}%. 너는? #AI_Shift #AI_시프트`;

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
