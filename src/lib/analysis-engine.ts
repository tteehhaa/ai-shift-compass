import type { AnalyzedActivity, AnalysisResult, ActivityCategory, AIInvolvement, ReplacementLevel, RoutineEntry, TimeReport } from './types';

// ── 색상/라벨/설명 상수 (Dashboard & ShareCards에서 사용) ──
export const REPLACEMENT_COLORS: Record<ReplacementLevel, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  assist: '#3b82f6',
  human: '#a855f7',
};

export const REPLACEMENT_LABELS: Record<ReplacementLevel, string> = {
  critical: '완전 대체',
  high: 'AI 잠식',
  medium: '부분 지원',
  low: '보조 활용',
  assist: '자동화 성공',
  human: '인간 고유',
};

export const REPLACEMENT_DESCRIPTIONS: Record<ReplacementLevel, string> = {
  critical: 'AI가 거의 완전히 대체 가능한 활동',
  high: '알고리즘에 시간을 빼앗기는 활동',
  medium: 'AI가 부분적으로 지원 가능한 활동',
  low: 'AI를 보조적으로 활용하는 활동',
  assist: 'AI 도구로 크게 효율화된 활동',
  human: '인간만이 할 수 있는 고유 활동',
};

export const TIME_CATEGORY_COLORS: Record<string, string> = {
  gainHr: '#ef4444',
  erosionHr: '#f97316',
  augmentHr: '#3b82f6',
  mixedHr: '#eab308',
  humanHr: '#a855f7',
};

export const TIME_CATEGORY_LABELS: Record<string, string> = {
  gainHr: '완전 대체',
  erosionHr: 'AI 잠식',
  augmentHr: '자동화 성공',
  mixedHr: '부분 지원',
  humanHr: '인간 고유',
};

export const TIME_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  gainHr: 'AI가 완전히 대체할 수 있는 시간',
  erosionHr: '알고리즘에 빼앗긴 시간',
  augmentHr: 'AI 도구로 효율화한 시간',
  mixedHr: 'AI가 부분 지원하는 시간',
  humanHr: '인간 고유 활동 시간',
};

const COMPRESSION_RATES: Record<ActivityCategory, number> = {
  '정보학습': 5.0,
  '문서사무': 4.0,
  '전문기술': 4.5,
  '창의기획': 2.5,
  '일상': 1.0,
};

const AGENCY_RATES: Record<string, number> = {
  active: 1.0,
  passive: 0.5,
  none: 1.0,
};

const HOURLY_VALUE = 10030; // 2025 최저시급

// ── 시멘틱 분류기 (우선순위 기반) ──
function classifyActivity(text: string): { category: ActivityCategory; involvement: AIInvolvement; isHighCognitive: boolean } {
  const t = text.toLowerCase();

  // [P1] 인간 고유 영역 (보라 / 대체율 0~5%)
  if (/식사|밥|산책|조깅|요가|운동|수면|잠|낮잠|휴식|목욕|샤워|대화|수다|육아|농구|축구|헬스|명상|그림|스트레칭|필라테스|등산|자전거|수영|걷기|놀이|간식|커피|차|음식|요리/.test(t)) {
    return { category: '일상', involvement: 'none', isHighCognitive: false };
  }

  // [P2] AI 잠식 (빨강/주황 / 대체율 90%+)
  if (/유튜브|youtube|sns|인스타|instagram|틱톡|tiktok|쇼츠|shorts|릴스|reels|넷플릭스|netflix|웹서핑|커뮤니티|웹툰|숏폼|트위터|twitter|레딧|reddit|페이스북|facebook/.test(t)) {
    return { category: '일상', involvement: 'passive', isHighCognitive: false };
  }

  // [P3] 전문기술
  if (/코딩|개발|디자인|분석|데이터|프로그래밍|설계|개발/.test(t))
    return { category: '전문기술', involvement: 'active', isHighCognitive: true };
  // [P4] 문서사무
  if (/보고서|이메일|문서|작성|발표|ppt|엑셀|회의록|정리|메일|번역/.test(t))
    return { category: '문서사무', involvement: 'active', isHighCognitive: false };
  // [P5] 정보학습
  if (/공부|학습|강의|책|리서치|검색|뉴스|논문|읽|조사|자료/.test(t))
    return { category: '정보학습', involvement: 'active', isHighCognitive: true };
  // [P6] 창의기획
  if (/기획|아이디어|브레인스토밍|전략|컨셉|창작|글쓰기/.test(t))
    return { category: '창의기획', involvement: 'active', isHighCognitive: true };

  return { category: '일상', involvement: 'none', isHighCognitive: false };
}

// ── 점수 → 레벨 ──
function getReplacementLevel(score: number, involvement: AIInvolvement): ReplacementLevel {
  if (involvement === 'none') return 'human';
  if (involvement === 'passive') return 'high';
  if (score >= 85) return 'critical';
  if (score >= 60) return 'assist';
  if (score >= 40) return 'low';
  if (score >= 20) return 'medium';
  return 'human';
}

// ── 페르소나 ──
function getPersona(shiftIndex: number, needsDetox: boolean): { persona: string; emoji: string; title: string; description: string } {
  if (needsDetox) return { persona: 'digital_zombie', emoji: '🧟', title: '디지털 좀비', description: 'AI 알고리즘에 시간을 뺏기고 있어요. 디지털 디톡스가 시급합니다.' };
  if (shiftIndex >= 80) return { persona: 'ai_native', emoji: '🚀', title: 'AI 네이티브', description: 'AI를 완벽히 활용하는 미래형 인재입니다.' };
  if (shiftIndex >= 60) return { persona: 'optimizer', emoji: '⚡', title: '효율 최적화러', description: 'AI 도구를 적극 활용해 생산성을 높이고 있어요.' };
  if (shiftIndex >= 40) return { persona: 'adapter', emoji: '🔄', title: '적응 중', description: 'AI 활용을 시작했지만 아직 잠재력이 남아있어요.' };
  if (shiftIndex >= 20) return { persona: 'analog', emoji: '📝', title: '아날로그 감성러', description: '대부분의 활동이 인간 고유 영역에 있습니다.' };
  return { persona: 'purist', emoji: '🌿', title: '퓨어리스트', description: '디지털과 거리를 두고 자연스러운 일상을 보내고 있어요.' };
}

export function analyzeRoutines(routines: RoutineEntry[], mbti: string): AnalysisResult {
  // ── 활동 분석 ──
  const activities: AnalyzedActivity[] = routines.map((r) => {
    const { category, involvement, isHighCognitive } = classifyActivity(r.activity);

    let repScore = 0;
    if (involvement === 'none') {
      repScore = Math.round(Math.random() * 5); // 0~5%
    } else if (involvement === 'passive') {
      repScore = 90 + Math.round(Math.random() * 10); // 90~100%
    } else {
      // active: 카테고리별 범위
      if (category === '전문기술') repScore = 60 + Math.round(Math.random() * 25);
      else if (category === '문서사무') repScore = 55 + Math.round(Math.random() * 30);
      else if (category === '정보학습') repScore = 50 + Math.round(Math.random() * 25);
      else if (category === '창의기획') repScore = 30 + Math.round(Math.random() * 25);
      else repScore = 20 + Math.round(Math.random() * 20);
    }

    const level = getReplacementLevel(repScore, involvement);
    const compressionRatio = COMPRESSION_RATES[category] || 1;
    const agencyRate = AGENCY_RATES[involvement] || 1;
    const savedTime = involvement === 'none' ? 0 : r.duration * (1 - 1 / compressionRatio) * agencyRate;

    return {
      activity: r.activity,
      time: r.time,
      original_duration_hr: r.duration,
      ai_involvement: involvement,
      category,
      is_high_cognitive: isHighCognitive,
      compression_ratio: compressionRatio,
      saved_time_hr: Math.round(savedTime * 100) / 100,
      agency_adjusted_hr: Math.round(savedTime * agencyRate * 100) / 100,
      replacement_score: repScore,
      replacement_level: level,
    };
  });

  // ── 시간 리포트: activities 배열 순회로 합산 ──
  const totalHr = activities.reduce((s, a) => s + a.original_duration_hr, 0);
  let gainHr = 0;
  let erosionHr = 0;
  let augmentHr = 0;
  let mixedHr = 0;
  let humanHr = 0;

  for (const a of activities) {
    switch (a.replacement_level) {
      case 'critical': gainHr += a.original_duration_hr; break;
      case 'high': erosionHr += a.original_duration_hr; break;
      case 'assist': augmentHr += a.original_duration_hr; break;
      case 'low':
      case 'medium': mixedHr += a.original_duration_hr; break;
      case 'human': humanHr += a.original_duration_hr; break;
    }
  }

  const timeReport: TimeReport = {
    totalHr: Math.round(totalHr * 100) / 100,
    gainHr: Math.round(gainHr * 100) / 100,
    erosionHr: Math.round(erosionHr * 100) / 100,
    augmentHr: Math.round(augmentHr * 100) / 100,
    mixedHr: Math.round(mixedHr * 100) / 100,
    humanHr: Math.round(humanHr * 100) / 100,
  };

  // ── 경제적 가치: 잠식 제외, 생산적 절약 시간만 ──
  const productiveSavedHr = activities
    .filter(a => a.ai_involvement === 'active')
    .reduce((s, a) => s + a.saved_time_hr, 0);

  const economicDaily = Math.round(productiveSavedHr * HOURLY_VALUE);
  const humanTimePercent = totalHr > 0 ? Math.round((humanHr / totalHr) * 100) : 0;

  // ── 디톡스 / 시프트 지수 ──
  const erosionRatio = totalHr > 0 ? erosionHr / totalHr : 0;
  const needsDetox = erosionRatio >= 0.3;
  const shiftIndex = Math.min(100, Math.round(
    (activities.reduce((s, a) => s + a.replacement_score * a.original_duration_hr, 0) / Math.max(totalHr, 1))
  ));

  const { persona, emoji, title, description } = getPersona(shiftIndex, needsDetox);

  return {
    shiftIndex,
    persona,
    personaEmoji: emoji,
    personaDescription: description,
    personaTitle: title,
    activities,
    timeReport,
    humanTimePercent,
    economicValueDaily: economicDaily,
    economicValueMonthly: economicDaily * 22,
    economicValueYearly: economicDaily * 260,
    percentileRank: Math.min(99, Math.max(1, shiftIndex + Math.round(Math.random() * 10 - 5))),
    wellnessAdvice: needsDetox
      ? '📵 알고리즘 소비 시간을 줄이고, 산책이나 독서로 대체해보세요.'
      : humanTimePercent >= 50
        ? '🌿 인간 고유 활동이 충분합니다. AI 도구를 더 활용해보세요.'
        : '⚡ AI 활용도가 높습니다. 중간중간 오프라인 휴식을 추가하세요.',
    needsDetox,
    compatibleMBTI: mbti === 'INTJ' ? 'ENFP' : mbti === 'ENFP' ? 'INTJ' : 'INFJ',
    compatiblePersona: persona === 'ai_native' ? '퓨어리스트' : 'AI 네이티브',
    oneLinerSummary: `당신의 하루 ${totalHr}시간 중 ${humanTimePercent}%는 인간 고유 시간입니다.`,
  };
}
