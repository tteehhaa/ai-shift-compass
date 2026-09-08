export type MBTIType = string;

export type AIInvolvement = 'active' | 'passive' | 'none';

// New tag-based category system
export type TagCategory =
  | '💻 전문 업무'
  | '📧 단순 행정'
  | '📚 자기계발'
  | '📱 소셜 미디어'
  | '🎬 미디어 감상'
  | '🏃 운동/활동'
  | '🤝 대면 소통'
  | '🛌 휴식/수면'
  | '🚗 운전'
  | '🥗 식사/요리'
  | '🧹 집안일/쇼핑'
  | '➕ 기타';

// Tag group for color coding
export type TagGroup = '생산성' | '디지털 소비' | '오프라인/에너지' | '생활 루틴';

// Legacy category (kept for analysis engine compatibility)
export type ActivityCategory = '정보학습' | '문서사무' | '전문기술' | '창의기획' | '일상';

export type ReplacementLevel = 'critical' | 'high' | 'medium' | 'low' | 'assist' | 'human';

export interface RoutineEntry {
  time: string;
  activity: string;
  duration: number;
  tag: TagCategory;
}

export interface AnalyzedActivity {
  activity: string;
  time: string;
  original_duration_hr: number;
  ai_involvement: AIInvolvement;
  category: ActivityCategory;
  tag: TagCategory;
  is_high_cognitive: boolean;
  compression_ratio: number;
  saved_time_hr: number;
  agency_adjusted_hr: number;
  replacement_score: number;
  replacement_level: ReplacementLevel;
}

export interface TimeReport {
  totalHr: number;
  gainHr: number;
  erosionHr: number;
  augmentHr: number;
  mixedHr: number;
  humanHr: number;
}

export interface AIRecommendation {
  tool: string;
  reason: string;
  icon: string;
}

export interface AnalysisResult {
  shiftIndex: number;
  persona: string;
  personaEmoji: string;
  personaDescription: string;
  personaTitle: string;
  activities: AnalyzedActivity[];
  timeReport: TimeReport;
  humanTimePercent: number;
  economicValueDaily: number;
  economicValueMonthly: number;
  economicValueYearly: number;
  erosionCostDaily: number;
  percentileRank: number;
  wellnessAdvice: string;
  needsDetox: boolean;
  compatibleMBTI: string;
  compatiblePersona: string;
  compatibleEmoji: string;
  compatibleReason: string;
  oneLinerSummary: string;
  recommendations: AIRecommendation[];
}

export interface UserInput {
  mbti: string;
  routines: RoutineEntry[];
}

// Tag configuration
// PRD 3.6 D7 — 색 블록(파스텔 배경 채우기)을 쓰지 않는다.
// 색은 텍스트에만 남기고, 구분은 그룹별 명도 차이로 낸다.
export const TAG_CONFIG: Record<TagCategory, { group: TagGroup; color: string; bgColor: string }> = {
  '💻 전문 업무': { group: '생산성', color: '#26215C', bgColor: 'transparent' },
  '📧 단순 행정': { group: '생산성', color: '#26215C', bgColor: 'transparent' },
  '📚 자기계발': { group: '생산성', color: '#26215C', bgColor: 'transparent' },
  '📱 소셜 미디어': { group: '디지털 소비', color: '#534AB7', bgColor: 'transparent' },
  '🎬 미디어 감상': { group: '디지털 소비', color: '#534AB7', bgColor: 'transparent' },
  '🏃 운동/활동': { group: '오프라인/에너지', color: '#55524B', bgColor: 'transparent' },
  '🤝 대면 소통': { group: '오프라인/에너지', color: '#55524B', bgColor: 'transparent' },
  '🛌 휴식/수면': { group: '오프라인/에너지', color: '#55524B', bgColor: 'transparent' },
  '🚗 운전': { group: '오프라인/에너지', color: '#55524B', bgColor: 'transparent' },
  '🥗 식사/요리': { group: '생활 루틴', color: '#8A857A', bgColor: 'transparent' },
  '🧹 집안일/쇼핑': { group: '생활 루틴', color: '#8A857A', bgColor: 'transparent' },
  '➕ 기타': { group: '생활 루틴', color: '#8A857A', bgColor: 'transparent' },
};

export const TAG_GROUPS: Record<TagGroup, TagCategory[]> = {
  '생산성': ['💻 전문 업무', '📧 단순 행정', '📚 자기계발'],
  '디지털 소비': ['📱 소셜 미디어', '🎬 미디어 감상'],
  '오프라인/에너지': ['🏃 운동/활동', '🤝 대면 소통', '🛌 휴식/수면', '🚗 운전'],
  '생활 루틴': ['🥗 식사/요리', '🧹 집안일/쇼핑', '➕ 기타'],
};
