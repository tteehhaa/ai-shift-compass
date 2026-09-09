/**
 * 직종 × 업무 프리셋 매트릭스 — PRD §9-5, 화면정의 S1·S2
 *
 * PRD 3.1: "입력이 직업명이 아니라 내 업무 목록이다." 직종은 업무 프리셋을
 * 부르기 위한 최소 입력일 뿐이고, 진단의 재료는 아래 업무 목록이다.
 *
 * 설계 규칙
 *  · 업무 id 는 고정 식별자(영문 소문자·언더스코어). 이벤트 로깅·랭킹 집계는
 *    이 id 로만 나간다 — 사용자가 입력한 원문은 서버로 보내지 않는다 (S7 프라이버시).
 *  · exposure(노출도) 는 "AI가 잘하는 일인가"의 정도. 공개 지표를 참고한 추정치이고
 *    매핑표 전체는 비공개다 (PRD 3.4 원칙 4). 여기 있는 값은 서비스 내부 계수다.
 *  · composition 은 유형16.md 축 C — 지식노동 편중(knowledge) ↔ 관계·실행 편중(relational).
 *  · category 는 랭킹 집계용 범주명. 개인 업무명 대신 이것을 노출한다.
 */

export type Composition = "knowledge" | "relational";

export type TaskCategory =
  | "문서·행정"
  | "커뮤니케이션"
  | "제작·생산"
  | "분석·조사"
  | "대면·관계"
  | "관리·판단";

export interface TaskPreset {
  id: string;
  label: string;
  /** 0~100. 높을수록 "AI에 맡겨도 되는 일" */
  exposure: number;
  composition: Composition;
  category: TaskCategory;
  /** 슬라이더 기본값(주당 시간). 화면정의 S3 "중앙값 프리셋" */
  defaultHours: number;
}

/** 업무 풀. 직종끼리 공유한다 — 같은 업무는 같은 id 를 써야 랭킹이 모인다. */
export const TASKS: Record<string, TaskPreset> = {
  // ── 문서·행정 ──
  doc_draft:      { id: "doc_draft",      label: "문서·보고서 초안 작성",   exposure: 82, composition: "knowledge",  category: "문서·행정",   defaultHours: 5 },
  doc_format:     { id: "doc_format",     label: "자료 정리·서식 맞추기",   exposure: 90, composition: "knowledge",  category: "문서·행정",   defaultHours: 3 },
  meeting_notes:  { id: "meeting_notes",  label: "회의록 정리",             exposure: 88, composition: "knowledge",  category: "문서·행정",   defaultHours: 2 },
  data_entry:     { id: "data_entry",     label: "데이터 입력·정리",        exposure: 92, composition: "knowledge",  category: "문서·행정",   defaultHours: 3 },
  invoice:        { id: "invoice",        label: "정산·세금계산서·입금 확인", exposure: 74, composition: "knowledge", category: "문서·행정",   defaultHours: 2 },
  quote_proposal: { id: "quote_proposal", label: "견적서·제안서 작성",      exposure: 70, composition: "knowledge",  category: "문서·행정",   defaultHours: 4 },
  contract_admin: { id: "contract_admin", label: "계약·서류 처리",          exposure: 66, composition: "knowledge",  category: "문서·행정",   defaultHours: 2 },
  expense_admin:  { id: "expense_admin",  label: "경비·재고·발주 관리",      exposure: 72, composition: "knowledge",  category: "문서·행정",   defaultHours: 3 },

  // ── 커뮤니케이션 ──
  email_reply:    { id: "email_reply",    label: "이메일·메신저 응대",      exposure: 76, composition: "relational", category: "커뮤니케이션", defaultHours: 5 },
  schedule:       { id: "schedule",       label: "일정 조율·예약 관리",      exposure: 68, composition: "relational", category: "커뮤니케이션", defaultHours: 2 },
  cs_inquiry:     { id: "cs_inquiry",     label: "고객 문의 응대(비대면)",   exposure: 78, composition: "relational", category: "커뮤니케이션", defaultHours: 6 },
  internal_report:{ id: "internal_report",label: "내부 보고·공유",          exposure: 64, composition: "relational", category: "커뮤니케이션", defaultHours: 3 },

  // ── 제작·생산 ──
  copywriting:    { id: "copywriting",    label: "카피·콘텐츠 문안 작성",    exposure: 80, composition: "knowledge",  category: "제작·생산",   defaultHours: 5 },
  sns_content:    { id: "sns_content",    label: "SNS 콘텐츠 제작·업로드",   exposure: 76, composition: "knowledge",  category: "제작·생산",   defaultHours: 4 },
  design_visual:  { id: "design_visual",  label: "이미지·썸네일 디자인",     exposure: 68, composition: "knowledge",  category: "제작·생산",   defaultHours: 6 },
  design_concept: { id: "design_concept", label: "디자인 콘셉트·방향 잡기",  exposure: 34, composition: "knowledge",  category: "제작·생산",   defaultHours: 4 },
  video_edit:     { id: "video_edit",     label: "영상 편집·자막",          exposure: 62, composition: "knowledge",  category: "제작·생산",   defaultHours: 8 },
  photo_retouch:  { id: "photo_retouch",  label: "사진 보정·선별",          exposure: 70, composition: "knowledge",  category: "제작·생산",   defaultHours: 5 },
  coding:         { id: "coding",         label: "코드 작성·기능 구현",      exposure: 72, composition: "knowledge",  category: "제작·생산",   defaultHours: 12 },
  code_review:    { id: "code_review",    label: "코드 리뷰·구조 설계",      exposure: 46, composition: "knowledge",  category: "제작·생산",   defaultHours: 4 },
  bug_fix:        { id: "bug_fix",        label: "장애 대응·버그 수정",      exposure: 54, composition: "knowledge",  category: "제작·생산",   defaultHours: 4 },
  translation:    { id: "translation",    label: "번역·감수",               exposure: 84, composition: "knowledge",  category: "제작·생산",   defaultHours: 5 },
  lecture_prep:   { id: "lecture_prep",   label: "강의·교육 자료 준비",      exposure: 74, composition: "knowledge",  category: "제작·생산",   defaultHours: 5 },
  shoot_onsite:   { id: "shoot_onsite",   label: "촬영·현장 작업",          exposure: 16, composition: "relational", category: "제작·생산",   defaultHours: 8 },
  cooking_ops:    { id: "cooking_ops",    label: "조리·매장 운영 실무",      exposure: 12, composition: "relational", category: "제작·생산",   defaultHours: 20 },

  // ── 분석·조사 ──
  research:       { id: "research",       label: "자료 조사·시장 리서치",    exposure: 86, composition: "knowledge",  category: "분석·조사",   defaultHours: 4 },
  data_analysis:  { id: "data_analysis",  label: "데이터 분석·리포팅",       exposure: 78, composition: "knowledge",  category: "분석·조사",   defaultHours: 5 },
  ad_ops:         { id: "ad_ops",         label: "광고 세팅·성과 점검",      exposure: 72, composition: "knowledge",  category: "분석·조사",   defaultHours: 5 },
  bookkeeping:    { id: "bookkeeping",    label: "장부·회계 처리",          exposure: 80, composition: "knowledge",  category: "분석·조사",   defaultHours: 6 },
  planning:       { id: "planning",       label: "기획·전략 설계",          exposure: 38, composition: "knowledge",  category: "분석·조사",   defaultHours: 6 },

  // ── 대면·관계 ──
  client_meeting: { id: "client_meeting", label: "고객·클라이언트 미팅",     exposure: 14, composition: "relational", category: "대면·관계",   defaultHours: 5 },
  sales_visit:    { id: "sales_visit",    label: "영업·신규 발굴",          exposure: 22, composition: "relational", category: "대면·관계",   defaultHours: 8 },
  negotiation:    { id: "negotiation",    label: "협상·조건 조율",          exposure: 12, composition: "relational", category: "대면·관계",   defaultHours: 3 },
  counseling:     { id: "counseling",     label: "상담·코칭(대면)",         exposure: 15, composition: "relational", category: "대면·관계",   defaultHours: 6 },
  teaching_live:  { id: "teaching_live",  label: "강의·수업 진행",          exposure: 18, composition: "relational", category: "대면·관계",   defaultHours: 8 },
  showing_field:  { id: "showing_field",  label: "현장 안내·임장",          exposure: 10, composition: "relational", category: "대면·관계",   defaultHours: 8 },
  networking:     { id: "networking",     label: "네트워킹·관계 관리",       exposure: 20, composition: "relational", category: "대면·관계",   defaultHours: 3 },
  sourcing:       { id: "sourcing",       label: "상품 소싱·거래처 협의",     exposure: 20, composition: "relational", category: "대면·관계",   defaultHours: 6 },
  interview_hr:   { id: "interview_hr",   label: "면접·채용 진행",          exposure: 26, composition: "relational", category: "대면·관계",   defaultHours: 4 },

  // ── 관리·판단 ──
  decision:       { id: "decision",       label: "최종 의사결정·승인",       exposure: 10, composition: "relational", category: "관리·판단",   defaultHours: 3 },
  qa_review:      { id: "qa_review",      label: "품질 검수·최종 확인",      exposure: 36, composition: "knowledge",  category: "관리·판단",   defaultHours: 4 },
  team_manage:    { id: "team_manage",    label: "팀·외주 인력 관리",        exposure: 24, composition: "relational", category: "관리·판단",   defaultHours: 5 },
  project_manage: { id: "project_manage", label: "일정·프로젝트 관리",       exposure: 58, composition: "relational", category: "관리·판단",   defaultHours: 5 },
  people_care:    { id: "people_care",    label: "구성원 면담·조직 관리",    exposure: 16, composition: "relational", category: "관리·판단",   defaultHours: 4 },
};

export type Track = "A" | "B";

export interface Occupation {
  id: string;
  label: string;
  /** 어느 타깃에서 주로 나오는 직종인지. 진단 엔진은 공용이고 정렬에만 쓴다 (PRD 3.4 원칙 3) */
  lean: Track | "both";
  taskIds: string[];
}

/**
 * 직종 18개 — 화면정의 S1 "칩 15~20개".
 * A(프리랜서·1인사업자) 10 / B(이직 준비 직장인) 8 로 두 갈래를 모두 덮는다.
 */
export const OCCUPATIONS: Occupation[] = [
  { id: "designer",    label: "디자이너",           lean: "A", taskIds: ["design_visual", "design_concept", "copywriting", "client_meeting", "quote_proposal", "email_reply", "qa_review", "invoice", "research"] },
  { id: "developer",   label: "개발자",             lean: "both", taskIds: ["coding", "code_review", "bug_fix", "doc_draft", "meeting_notes", "planning", "email_reply", "project_manage", "research"] },
  { id: "video",       label: "영상 편집·크리에이터", lean: "A", taskIds: ["video_edit", "shoot_onsite", "copywriting", "sns_content", "design_visual", "email_reply", "invoice", "client_meeting", "research"] },
  { id: "photo",       label: "사진·촬영",          lean: "A", taskIds: ["shoot_onsite", "photo_retouch", "schedule", "client_meeting", "invoice", "sns_content", "email_reply", "quote_proposal"] },
  { id: "marketer",    label: "마케터",             lean: "both", taskIds: ["ad_ops", "copywriting", "sns_content", "data_analysis", "research", "planning", "email_reply", "internal_report", "client_meeting"] },
  { id: "writer",      label: "작가·에디터",        lean: "A", taskIds: ["copywriting", "research", "doc_draft", "translation", "qa_review", "email_reply", "invoice", "client_meeting"] },
  { id: "translator",  label: "번역가",             lean: "A", taskIds: ["translation", "qa_review", "research", "email_reply", "invoice", "quote_proposal", "client_meeting", "negotiation"] },
  { id: "consultant",  label: "컨설턴트·강사",       lean: "A", taskIds: ["lecture_prep", "teaching_live", "counseling", "research", "doc_draft", "quote_proposal", "client_meeting", "invoice", "sns_content"] },
  { id: "shop",        label: "온라인 쇼핑몰 운영",  lean: "A", taskIds: ["sns_content", "cs_inquiry", "expense_admin", "copywriting", "photo_retouch", "ad_ops", "data_analysis", "invoice", "sourcing", "qa_review"] },
  { id: "fnb",         label: "요식·오프라인 자영업", lean: "A", taskIds: ["cooking_ops", "expense_admin", "cs_inquiry", "sns_content", "invoice", "bookkeeping", "team_manage", "schedule"] },
  { id: "realtor",     label: "공인중개·영업직",     lean: "both", taskIds: ["showing_field", "sales_visit", "negotiation", "cs_inquiry", "contract_admin", "email_reply", "sns_content", "schedule", "data_entry"] },
  { id: "coach",       label: "코치·상담사",        lean: "A", taskIds: ["counseling", "lecture_prep", "schedule", "sns_content", "doc_draft", "invoice", "networking", "research"] },
  { id: "office",      label: "사무·경영지원",       lean: "B", taskIds: ["doc_draft", "data_entry", "meeting_notes", "schedule", "email_reply", "expense_admin", "internal_report", "contract_admin", "qa_review", "team_manage"] },
  { id: "sales",       label: "영업·세일즈",        lean: "B", taskIds: ["sales_visit", "client_meeting", "quote_proposal", "negotiation", "email_reply", "data_entry", "internal_report", "schedule", "research"] },
  { id: "hr",          label: "인사·HR",           lean: "B", taskIds: ["interview_hr", "people_care", "doc_draft", "data_entry", "internal_report", "schedule", "contract_admin", "research", "email_reply"] },
  { id: "finance",     label: "회계·재무",          lean: "B", taskIds: ["bookkeeping", "data_analysis", "invoice", "doc_format", "internal_report", "qa_review", "contract_admin", "email_reply", "decision"] },
  { id: "planner",     label: "기획·전략",          lean: "B", taskIds: ["planning", "research", "data_analysis", "doc_draft", "meeting_notes", "internal_report", "project_manage", "decision", "email_reply"] },
  { id: "cs",          label: "고객지원·CS",        lean: "B", taskIds: ["cs_inquiry", "email_reply", "data_entry", "doc_format", "qa_review", "internal_report", "schedule", "counseling"] },
];

export function getOccupation(id: string): Occupation | undefined {
  return OCCUPATIONS.find((o) => o.id === id);
}

export function tasksOf(occupationId: string): TaskPreset[] {
  const occ = getOccupation(occupationId);
  if (!occ) return [];
  return occ.taskIds.map((id) => TASKS[id]).filter(Boolean);
}

/** 화면정의 S2 — 최대 7개. 그 이상은 S3(통합 화면)가 무거워진다. */
export const MAX_TASKS = 7;
/** 권장 범위 (선택 개수 표시에 쓴다) */
export const RECOMMENDED_MIN = 3;
export const RECOMMENDED_MAX = 5;
