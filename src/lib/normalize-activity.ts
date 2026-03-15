/**
 * Activity name normalization — maps free-text input to standardized names
 * so that the DB aggregates duplicate concepts under one label.
 */

type NormRule = { pattern: RegExp; standard: string };

const NORM_RULES: NormRule[] = [
  // 커뮤니케이션
  { pattern: /메일|이메일|email|e-mail|메일링/i, standard: '이메일 작성 및 관리' },
  { pattern: /회의|미팅|meeting|줌|zoom|화상|컨콜|콜/, standard: '회의 및 미팅' },
  { pattern: /슬랙|slack|채팅|메신저|카톡|메시지/, standard: '메신저 및 채팅' },

  // 문서 · 보고
  { pattern: /보고서|리포트|report/, standard: '보고서 작성' },
  { pattern: /문서|작성|워드|한글|docs/, standard: '문서 작성 및 편집' },
  { pattern: /ppt|발표|프레젠|슬라이드|keynote/, standard: '프레젠테이션 제작' },

  // 데이터 · 분석
  { pattern: /엑셀|스프레드시트|excel|spreadsheet|시트/, standard: '스프레드시트 작업' },
  { pattern: /데이터\s*분석|통계|analytics/, standard: '데이터 분석' },

  // 개발
  { pattern: /코딩|개발|프로그래밍|코드|programming|coding|dev/, standard: '소프트웨어 개발' },

  // 디자인
  { pattern: /디자인|design|figma|피그마|그래픽|일러스트/, standard: '디자인 작업' },

  // 리서치
  { pattern: /리서치|검색|조사|서치|research|논문/, standard: '리서치 및 정보 탐색' },

  // 기획
  { pattern: /기획|전략|플래닝|planning|strategy/, standard: '기획 및 전략 수립' },

  // 번역
  { pattern: /번역|영어|통역|translat/, standard: '번역 및 외국어 업무' },

  // 소셜 미디어
  { pattern: /인스타|instagram|틱톡|tiktok|트위터|twitter|x\.com|sns/, standard: 'SNS 브라우징' },
  { pattern: /유튜브|youtube|넷플릭스|netflix|영상\s*시청|동영상/, standard: '영상 콘텐츠 시청' },
  { pattern: /뉴스|기사|news/, standard: '뉴스 소비' },

  // 생활
  { pattern: /운동|헬스|gym|조깅|러닝|걷기|산책|요가|필라테스/, standard: '운동 및 신체 활동' },
  { pattern: /밥|식사|점심|저녁|아침|요리|cook|배달/, standard: '식사 및 요리' },
  { pattern: /수면|잠|낮잠|sleep/, standard: '수면 및 휴식' },
  { pattern: /출퇴근|통근|이동|운전|대중교통|버스|지하철/, standard: '이동 및 통근' },
  { pattern: /청소|빨래|정리|집안일|쇼핑|장보기|마트/, standard: '가사 및 쇼핑' },
];

/**
 * Normalizes a user-entered activity name to a standard label.
 * Returns the standard name if matched, otherwise the trimmed original.
 */
export function normalizeActivityName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  for (const rule of NORM_RULES) {
    if (rule.pattern.test(trimmed)) {
      return rule.standard;
    }
  }
  return trimmed;
}
