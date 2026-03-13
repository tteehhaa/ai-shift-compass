import type { AnalyzedActivity, AnalysisResult, ActivityCategory, AIInvolvement, ReplacementLevel, RoutineEntry, TimeReport } from './types';

// 1. 카테고리별 기본 설정 (수치 조정)
const COMPRESSION_RATES: Record<ActivityCategory, number> = {
  '정보학습': 5.0,
  '문서사무': 4.0,
  '전문기술': 4.5,
  '창의기획': 2.5,
  '일상': 1.0,
};

const AGENCY_RATES: Record<string, number> = {
  active: 1.0,
  passive: 0.5, // 알고리즘 잠식은 효율이 낮음
  none: 1.0,
};

const HOURLY_VALUE = 10030; // 2025 최저시급

// 2. 분류 로직: '인간 고유 활동' 방어 우선
function classifyActivity(text: string): { category: ActivityCategory; involvement: AIInvolvement; isHighCognitive: boolean } {
  const t = text.toLowerCase();
  
  // [우선순위 1] 인간 고유 영역 (물리적, 생리적 활동) -> 절대 보라색 방어
  if (/식사|밥|산책|요가|운동|수면|잠|휴식|목욕|샤워|대화|수다|육아|농구|축구|헬스|명상/.test(t)) {
    return { category: '일상', involvement: 'none', isHighCognitive: false };
  }
  
  // [우선순위 2] AI 잠식 (수동적 미디어 소비) -> 빨강/주황
  if (/유튜브|sns|인스타|틱톡|쇼츠|릴스|넷플릭스|웹서핑|커뮤니티|웹툰|숏폼/.test(t)) {
    return { category: '일상', involvement: 'passive', isHighCognitive: false };
  }

  // [우선순위 3] 생산성 및 전문 업무 -> 파랑/초록
  if (/코딩|개발|디자인|분석|데이터|프로그래밍|설계/.test(t))
    return { category: '전문기술', involvement: 'active', isHighCognitive: true };
  if (/보고서|이메일|문서|작성|발표|ppt|엑셀|회의록|정리|메일/.test(t))
    return { category: '문서사무', involvement: 'active', isHighCognitive: false };
  if (/공부|학습|강의|책|리서치|검색|뉴스|논문|읽|조사/.test(t))
    return { category: '정보학습', involvement: 'active', isHighCognitive: true };
  if (/기획|아이디어|브레인스토밍|전략|컨셉|창작|글쓰기/.test(t))
    return { category: '창의기획', involvement: 'active', isHighCognitive: true };

  return { category: '일상', involvement: 'none', isHighCognitive: false };
}

// 3. 점수 기반 레벨 확정
function getReplacementLevel(score: number, involvement: AIInvolvement): ReplacementLevel {
  if (involvement === 'none') return 'human';
  if (involvement === 'passive') return 'high'; // 무조건 잠식으로 분류
  if (score >= 85) return 'critical';
  if (score >= 60) return 'assist'; // 자동화 성공(파랑) 비중 확대
  if (score >= 40) return 'low';    // 보조 활용(초록)
  if (score >= 20) return 'medium'; // 부분 지원(노랑)
  return 'human';
}

export function analyzeRoutines(routines: RoutineEntry[], mbti: string): AnalysisResult {
  const activities: AnalyzedActivity[] = routines.map((r) => {
    const { category, involvement, isHighCognitive } = classifyActivity(r.activity);
    
    // 점수 산출 로직 개편
    let repScore = 0;
    if (involvement === 'none') repScore = 5;
    else if (involvement === 'passive') repScore = 85;
    else {
      if (category === '