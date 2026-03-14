import type {
  AnalyzedActivity,
  AnalysisResult,
  ActivityCategory,
  AIInvolvement,
  ReplacementLevel,
  RoutineEntry,
  TimeReport,
  TagCategory,
  AIRecommendation,
} from "./types";
import { TAG_CONFIG } from "./types";

const HOURLY_VALUE = 10030; // 2025 최저시급
const DOPAMINE_EROSION_FACTOR = 1.2;
const AI_LEVERAGE_FACTOR = 0.7;

// Tag → ActivityCategory 매핑
function tagToCategory(tag: TagCategory): ActivityCategory {
  switch (tag) {
    case '💻 전문 업무': return '전문기술';
    case '📧 단순 행정': return '문서사무';
    case '📚 자기계발': return '정보학습';
    case '📱 소셜 미디어':
    case '🎬 미디어 감상': return '일상';
    case '🏃 운동/활동':
    case '🤝 대면 소통':
    case '🛌 휴식/수면':
    case '🚗 운전': return '일상';
    case '🥗 식사/요리':
    case '🧹 집안일/쇼핑':
    case '➕ 기타': return '일상';
    default: return '일상';
  }
}

// Tag → AI Involvement
function tagToInvolvement(tag: TagCategory): AIInvolvement {
  const group = TAG_CONFIG[tag].group;
  if (group === '생산성') return 'active';
  if (group === '디지털 소비') return 'passive';
  return 'none'; // 오프라인/에너지, 생활 루틴
}

// Compression rates by tag
function getCompressionRate(tag: TagCategory): number {
  switch (tag) {
    case '💻 전문 업무': return 4.5;
    case '📧 단순 행정': return 5.0;
    case '📚 자기계발': return 4.0;
    default: return 1.0;
  }
}

// Tag-based replacement score
function getReplacementScore(tag: TagCategory, activity: string): number {
  const t = activity.toLowerCase();
  switch (tag) {
    case '📧 단순 행정': return 85;
    case '📚 자기계발': return 70;
    case '💻 전문 업무':
      if (/코딩|개발|프로그래밍/.test(t)) return 60;
      if (/기획|전략|디자인/.test(t)) return 45;
      return 55;
    case '📱 소셜 미디어': return 92;
    case '🎬 미디어 감상': return 88;
    case '🏃 운동/활동':
    case '🤝 대면 소통':
    case '🛌 휴식/수면':
    case '🚗 운전': return 5;
    case '🥗 식사/요리':
    case '🧹 집안일/쇼핑':
    case '➕ 기타': return 10;
    default: return 10;
  }
}

function getReplacementLevel(score: number, involvement: AIInvolvement): ReplacementLevel {
  if (involvement === "none") return "human";
  if (involvement === "passive") return "high";
  if (score >= 85) return "critical";
  if (score >= 60) return "assist";
  if (score >= 40) return "low";
  if (score >= 20) return "medium";
  return "human";
}

// AI 역제안: 키워드 매칭
function generateRecommendations(routines: RoutineEntry[]): AIRecommendation[] {
  const recs: AIRecommendation[] = [];
  const seen = new Set<string>();
  const allText = routines.map(r => r.activity.toLowerCase()).join(' ');
  const allTags = routines.map(r => r.tag);

  const addRec = (tool: string, reason: string, icon: string) => {
    if (!seen.has(tool)) { seen.add(tool); recs.push({ tool, reason, icon }); }
  };

  // 키워드 기반 추천
  if (/엑셀|데이터|스프레드시트|분석/.test(allText)) {
    addRec('ChatGPT Advanced Data Analysis', '데이터 분석·시각화를 자동화하여 엑셀 작업 시간을 80% 단축할 수 있습니다.', '📊');
  }
  if (/메일|이메일|영어|번역/.test(allText)) {
    addRec('DeepL / Grammarly', '영문 이메일·번역을 AI가 자연스럽게 처리하여 소통 시간을 절약합니다.', '✉️');
  }
  if (/보고서|문서|작성|ppt|발표/.test(allText)) {
    addRec('Notion AI / Gamma', '보고서·프레젠테이션 초안을 AI가 자동 생성하여 작성 시간을 줄입니다.', '📝');
  }
  if (/코딩|개발|프로그래밍|코드/.test(allText)) {
    addRec('GitHub Copilot / Cursor', 'AI 코드 어시스턴트로 개발 생산성을 2~3배 높일 수 있습니다.', '💻');
  }
  if (/리서치|검색|조사|논문/.test(allText)) {
    addRec('Perplexity AI', 'AI 기반 검색으로 리서치 시간을 대폭 줄이고 정확도를 높입니다.', '🔍');
  }
  if (/디자인|그래픽|이미지/.test(allText)) {
    addRec('Midjourney / Canva AI', 'AI 디자인 도구로 시각 자료 제작 시간을 크게 단축합니다.', '🎨');
  }

  // 태그 기반 추천
  if (allTags.includes('📱 소셜 미디어') || allTags.includes('🎬 미디어 감상')) {
    const digitalHours = routines
      .filter(r => r.tag === '📱 소셜 미디어' || r.tag === '🎬 미디어 감상')
      .reduce((s, r) => s + r.duration, 0);
    if (digitalHours >= 1) {
      addRec('스크린타임 관리 앱', `하루 ${digitalHours}시간의 디지털 소비 시간을 줄여 생산성 향상에 투자하세요.`, '📱');
    }
  }

  // AI 활용도가 0%인 경우
  const hasProductivity = allTags.some(t => TAG_CONFIG[t].group === '생산성');
  if (!hasProductivity) {
    addRec('AI 업무 효율화 도구', '일상의 반복 업무에 AI를 도입하면 하루 1~2시간의 여유를 확보할 수 있습니다. 비난이 아닌 기회입니다!', '🚀');
  }

  return recs;
}

// MBTI 페르소나 데이터
const PERSONA_MAP: Record<string, any> = {
  INTJ: { name: "AI 아키텍트", emoji: "🏗️", title: "AI 시대의 전략가", desc: "AI 시스템을 설계하고 최적화하는 마스터.", compatible: "ENFP", compatiblePersona: "AI 탐험가", compatibleEmoji: "🚀", compatibleReason: "당신의 치밀한 설계도에 예상치 못한 창의적 변수를 더해줄 파트너입니다." },
  INTP: { name: "AI 분석가", emoji: "🔬", title: "AI 시대의 탐구자", desc: "AI의 원리를 깊이 파고드는 연구자.", compatible: "ESFJ", compatiblePersona: "AI 커넥터", compatibleEmoji: "🤝", compatibleReason: "당신의 깊은 분석 결과를 사람들이 이해할 수 있는 언어로 전달해줄 파트너입니다." },
  ENTJ: { name: "AI 커맨더", emoji: "⚡", title: "AI 시대의 지휘관", desc: "AI를 전략적 무기로 활용하는 리더.", compatible: "ISFP", compatiblePersona: "AI 아티스트", compatibleEmoji: "🎭", compatibleReason: "당신의 강력한 실행력에 감성과 미적 완성도를 더해줄 파트너입니다." },
  ENTP: { name: "AI 이노베이터", emoji: "💡", title: "AI 시대의 혁신가", desc: "AI로 새로운 가능성을 실험하는 선구자.", compatible: "ISTJ", compatiblePersona: "AI 최적화러", compatibleEmoji: "⚙️", compatibleReason: "당신의 폭발적인 아이디어를 체계적인 결과물로 다듬어줄 파트너입니다." },
  INFJ: { name: "AI 비저너리", emoji: "🔮", title: "AI 시대의 예언자", desc: "인간 중심의 기술을 추구하는 이상가.", compatible: "ENTP", compatiblePersona: "AI 이노베이터", compatibleEmoji: "💡", compatibleReason: "당신의 이상적 비전을 현실적인 혁신 전략으로 구체화해줄 파트너입니다." },
  INFP: { name: "AI 뮤즈", emoji: "🎨", title: "AI 시대의 창작자", desc: "AI를 창의적 영감의 도구로 활용하는 창작자.", compatible: "ESTJ", compatiblePersona: "AI 매니저", compatibleEmoji: "📊", compatibleReason: "당신의 풍부한 상상력을 실행 가능한 프로젝트로 체계화해줄 파트너입니다." },
  ENFJ: { name: "AI 멘토", emoji: "🌟", title: "AI 시대의 안내자", desc: "AI 활용법을 주변에 전파하는 가이드.", compatible: "INTP", compatiblePersona: "AI 분석가", compatibleEmoji: "🔬", compatibleReason: "당신의 리더십에 데이터 기반의 객관적 근거를 제공해줄 파트너입니다." },
  ENFP: { name: "AI 탐험가", emoji: "🚀", title: "AI 시대의 모험가", desc: "다양한 AI 도구를 탐색하는 탐험가.", compatible: "INTJ", compatiblePersona: "AI 아키텍트", compatibleEmoji: "🏗️", compatibleReason: "당신의 다양한 탐험 결과를 하나의 강력한 시스템으로 설계해줄 파트너입니다." },
  ISTJ: { name: "AI 최적화러", emoji: "⚙️", title: "AI 시대의 장인", desc: "AI 효율을 극대화하는 관리 전문가.", compatible: "ENTP", compatiblePersona: "AI 이노베이터", compatibleEmoji: "💡", compatibleReason: "당신의 견고한 시스템에 혁신적 돌파구를 제안해줄 파트너입니다." },
  ISTP: { name: "AI 엔지니어", emoji: "🔧", title: "AI 시대의 기술자", desc: "AI 도구를 실용적으로 튜닝하는 기술자.", compatible: "ENFJ", compatiblePersona: "AI 멘토", compatibleEmoji: "🌟", compatibleReason: "당신의 뛰어난 기술력을 팀과 조직에 효과적으로 전파해줄 파트너입니다." },
  ESTJ: { name: "AI 매니저", emoji: "📊", title: "AI 시대의 관리자", desc: "AI 시스템을 체계적으로 운영하는 관리자.", compatible: "INFP", compatiblePersona: "AI 뮤즈", compatibleEmoji: "🎨", compatibleReason: "당신의 체계적 관리 능력에 창의적 영감과 새로운 시각을 불어넣어줄 파트너입니다." },
  ESTP: { name: "AI 해커", emoji: "🎯", title: "AI 시대의 실행가", desc: "빠르게 AI를 실전에 적용하는 행동파.", compatible: "INFJ", compatiblePersona: "AI 비저너리", compatibleEmoji: "🔮", compatibleReason: "당신의 빠른 실행력에 장기적 비전과 방향성을 제시해줄 파트너입니다." },
  ISFJ: { name: "AI 가디언", emoji: "🛡️", title: "AI 시대의 수호자", desc: "안전하고 윤리적인 AI 활용을 지키는 파수꾼.", compatible: "ESTP", compatiblePersona: "AI 해커", compatibleEmoji: "🎯", compatibleReason: "당신의 신중한 검증 능력에 과감한 실행력을 더해줄 파트너입니다." },
  ISFP: { name: "AI 아티스트", emoji: "🎭", title: "AI 시대의 예술가", desc: "AI로 미적 감각을 표현하는 예술가.", compatible: "ENTJ", compatiblePersona: "AI 커맨더", compatibleEmoji: "⚡", compatibleReason: "당신의 섬세한 작품을 시장에 효과적으로 런칭해줄 전략적 파트너입니다." },
  ESFJ: { name: "AI 커넥터", emoji: "🤝", title: "AI 시대의 연결자", desc: "AI를 통해 사람과 사람을 잇는 허브.", compatible: "INTP", compatiblePersona: "AI 분석가", compatibleEmoji: "🔬", compatibleReason: "당신의 네트워킹 역량에 심층적 데이터 분석력을 보강해줄 파트너입니다." },
  ESFP: { name: "AI 크리에이터", emoji: "🎬", title: "AI 시대의 엔터테이너", desc: "AI로 즐거운 콘텐츠를 만드는 제작자.", compatible: "ISTJ", compatiblePersona: "AI 최적화러", compatibleEmoji: "⚙️", compatibleReason: "당신의 창의적 콘텐츠 제작 과정을 효율적으로 시스템화해줄 파트너입니다." },
};

export function analyzeRoutines(routines: RoutineEntry[], mbti: string): AnalysisResult {
  const activities: AnalyzedActivity[] = routines.map((r) => {
    const category = tagToCategory(r.tag);
    const involvement = tagToInvolvement(r.tag);
    const repScore = getReplacementScore(r.tag, r.activity);
    const level = getReplacementLevel(repScore, involvement);
    const C = getCompressionRate(r.tag);
    const savedTime = involvement === "active" ? Math.round(r.duration * (1 - 1 / C) * 10) / 10 : 0;

    return {
      activity: r.activity,
      time: r.time,
      original_duration_hr: r.duration,
      ai_involvement: involvement,
      category,
      tag: r.tag,
      is_high_cognitive: involvement === 'active',
      compression_ratio: C,
      saved_time_hr: savedTime,
      agency_adjusted_hr: savedTime,
      replacement_score: repScore,
      replacement_level: level,
    };
  });

  const totalHr = activities.reduce((s, a) => s + a.original_duration_hr, 0) || 1;

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

  // A. 기회비용 산출
  // 생산성 태그: (시간 * AI대체지수 0.7 * 시급) = "AI 활용 시 절약 가능한 가치"
  const productivityValue = routines
    .filter(r => TAG_CONFIG[r.tag].group === '생산성')
    .reduce((s, r) => s + r.duration * AI_LEVERAGE_FACTOR * HOURLY_VALUE, 0);

  const economicDaily = Math.round(productivityValue);

  // 잠식 손실: 디지털 소비는 도파민잠식지수 1.2 적용, 나머지 critical/high는 시급 기준
  const digitalErosion = routines
    .filter(r => TAG_CONFIG[r.tag].group === '디지털 소비')
    .reduce((s, r) => s + r.duration * DOPAMINE_EROSION_FACTOR * HOURLY_VALUE, 0);
  const otherErosion = (timeReport.erosionHr - routines
    .filter(r => TAG_CONFIG[r.tag].group === '디지털 소비')
    .reduce((s, r) => s + r.duration, 0)) * HOURLY_VALUE;
  const erosionCostDaily = Math.round(Math.max(0, digitalErosion + otherErosion));

  // B. AI 역제안
  const recommendations = generateRecommendations(routines);

  const persona = PERSONA_MAP[mbti] || PERSONA_MAP["ISTJ"];

  const needsDetox = humanPercent < 20;
  let wellnessAdvice = `인간 고유 활동이 ${humanPercent}%로 아주 건강한 밸런스입니다!`;
  if (humanPercent < 15)
    wellnessAdvice = `인간 고유 활동이 ${humanPercent}%로 매우 낮습니다. 의도적인 디지털 디톡스를 권장합니다.`;
  else if (humanPercent < 30) wellnessAdvice = `AI와 인간 활동의 균형을 잘 잡고 계시네요.`;

  // C. 예외 처리: AI 활용도 0%인 경우
  if (shiftIndex === 0) {
    wellnessAdvice = '현재 AI를 활용하지 않고 계시네요. 비난이 아닌 기회입니다! 단순 업무부터 AI를 도입하면 귀중한 휴식 시간을 확보할 수 있어요.';
  }

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
    erosionCostDaily,
    percentileRank: Math.max(1, 100 - shiftIndex),
    wellnessAdvice,
    needsDetox,
    compatibleMBTI: persona.compatible,
    compatiblePersona: persona.compatiblePersona,
    compatibleEmoji: persona.compatibleEmoji || "🤖",
    compatibleReason: persona.compatibleReason || "시너지가 뛰어난 AI 파트너입니다.",
    oneLinerSummary: `나의 AI 시프트 지수는 ${shiftIndex}%! 당신의 일상은 안전한가요? #AI_Shift #AI_시프트`,
    recommendations,
  };
}

// 컬러 및 설명 데이터
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
