import type { AnalyzedActivity, AnalysisResult, ActivityCategory, AIInvolvement, RoutineEntry } from './types';

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

function classifyActivity(text: string): { category: ActivityCategory; involvement: AIInvolvement; isHighCognitive: boolean } {
  const t = text.toLowerCase();
  
  if (/공부|학습|강의|책|리서치|검색|뉴스|논문|읽|조사/.test(t)) {
    return { category: '정보학습', involvement: 'active', isHighCognitive: true };
  }
  if (/보고서|이메일|문서|작성|발표|ppt|엑셀|회의록|정리/.test(t)) {
    return { category: '문서사무', involvement: 'active', isHighCognitive: false };
  }
  if (/코딩|개발|디자인|분석|데이터|프로그래밍|설계/.test(t)) {
    return { category: '전문기술', involvement: 'active', isHighCognitive: true };
  }
  if (/기획|아이디어|브레인스토밍|전략|컨셉|창작|글쓰기/.test(t)) {
    return { category: '창의기획', involvement: 'active', isHighCognitive: true };
  }
  if (/sns|유튜브|넷플릭스|틱톡|인스타|스크롤|숏폼/.test(t)) {
    return { category: '일상', involvement: 'passive', isHighCognitive: false };
  }
  
  return { category: '일상', involvement: 'none', isHighCognitive: false };
}

function getStatus(involvement: AIInvolvement, category: ActivityCategory): 'erosion' | 'gain' | 'human' | 'assist' {
  if (involvement === 'passive') return 'erosion';
  if (involvement === 'none' && category === '일상') return 'human';
  if (involvement === 'active' && COMPRESSION_RATES[category] > 1) return 'gain';
  return 'assist';
}

export function analyzeRoutines(routines: RoutineEntry[], mbti: string): AnalysisResult {
  const activities: AnalyzedActivity[] = routines.map((r) => {
    const { category, involvement, isHighCognitive } = classifyActivity(r.activity);
    const C = COMPRESSION_RATES[category];
    const A = AGENCY_RATES[involvement];
    const E = involvement === 'none' ? 0 : 1;
    const Q = isHighCognitive ? 1.2 : 1.0;

    const savedTime = r.duration * (1 - 1 / C) * E;
    const agencyAdjusted = savedTime * A;
    const status = getStatus(involvement, category);

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
      status,
    };
  });

  const totalDay = activities.reduce((s, a) => s + a.original_duration_min, 0) || 1;
  const sumSavedQ = activities.reduce((s, a) => {
    const Q = a.is_high_cognitive ? 1.2 : 1.0;
    return s + a.saved_time_min * Q;
  }, 0);
  const sumPassive = activities.filter(a => a.ai_involvement === 'passive').reduce((s, a) => s + a.original_duration_min, 0);

  const shiftIndex = Math.round(((sumSavedQ + sumPassive) / totalDay) * 100);

  const persona = getPersona(shiftIndex, mbti);

  return {
    shiftIndex: Math.min(shiftIndex, 100),
    persona: persona.name,
    personaDescription: persona.desc,
    activities,
    totalOriginalMin: totalDay,
    totalSavedMin: Math.round(activities.reduce((s, a) => s + a.saved_time_min, 0)),
    totalErosionMin: Math.round(activities.filter(a => a.status === 'erosion').reduce((s, a) => s + a.original_duration_min, 0)),
    totalGainMin: Math.round(activities.filter(a => a.status === 'gain').reduce((s, a) => s + a.saved_time_min, 0)),
  };
}

function getPersona(index: number, mbti: string) {
  if (index >= 70) return { name: 'AI 네이티브 리더', desc: 'AI를 주도적으로 활용해 시간을 극대화하는 유형입니다. 높은 생산성과 효율을 자랑합니다.' };
  if (index >= 50) return { name: 'AI 하이브리드 워커', desc: 'AI와 인간 역량을 균형있게 결합하는 유형입니다. 적응력이 뛰어납니다.' };
  if (index >= 30) return { name: 'AI 탐색자', desc: 'AI 활용을 시작하고 있으며 더 많은 가능성을 탐색 중인 유형입니다.' };
  return { name: '아날로그 수호자', desc: '인간 고유의 활동에 집중하는 유형입니다. AI 도입의 여지가 큽니다.' };
}
