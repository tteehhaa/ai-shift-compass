# PDCA — PRD 잔여 구현 (AI Life Shift)

기준 문서: `docs/class/PRD.md` §9 착수 순서 · `docs/class/화면정의.md` · `docs/class/유형16.md`
시작: 2026-09-09
브랜치: `feat/prd-alignment`

## PLAN

### 착수 전 상태 (측정)
1 RLS ✅ · 2 이벤트로깅 ✅(스키마) · 3~7 ❌ · 8 🟡 · 9 🟡(1/3) · 10 ❌

### 이번 사이클 범위
| # | 작업 | PRD 근거 |
|---|---|---|
| P1 | 직종 × 업무 프리셋 매트릭스 | §9-5 |
| P2 | 입력부 교체 S0~S4 (D1 로딩 제거, D2 S2+S3 통합) | §9-6, 3.6 D1/D2 |
| P3 | 16유형 엔진 (노출도 × 활용도 × 구성 × 밀도) | §9-7, 유형16.md |
| P4 | 결과 7섹션 재구성 · 확정 금액/MBTI 제거 | §9-8, 3.4 원칙2 |
| P5 | 공유 3종 + 지목 카드 + /r/{id} + 동적 OG | §9-9, 화면정의 S7 |
| P6 | 궁합 S8a/S8b + /p/{id} + 이메일 2건 | §3.5, 화면정의 S8 |
| P7 | E1 이탈 방지 시트 | 화면정의 E1 |
| P8 | ADM 순위 6종 + 화면별 이탈률 | 화면정의 ADM |
| P9 | F2 반박 버튼 유형 재지정 | 3.7 F2 |

### 미결(§10) — 이번 사이클에서 내린 결정
| 미결 항목 | 결정 | 이유 |
|---|---|---|
| US-3 매출 환산 — 시간당 단가를 물을 것인가 | **묻지 않는다.** "한 건 더" 식 건수 환산만 | 3.4 원칙2. 단가를 물으면 확정 금액이 되살아난다 |
| 현실 계수 | **0.6** (이론 절감분의 60%만 인정) | 범위 표기(D3)와 겹쳐 과대 추정 방지 |
| 궁합 결과 문구 | **4분면 × 4분면 = 16조합** | 16×16=256은 과함 (§10 지침) |
| 궁합 대기 UX | 대기 화면 + 리마인드 1회 상한 | 화면정의 S8 |
| 동적 OG | **메타 태그 동적 + 이미지 유형별 정적 1종** | @vercel/og 한글 폰트 번들 리스크 회피, D6 "사전 제작 지향" |
| 이메일 보관 기간 | **12개월, 수신거부 링크 명시** | S9 표기 요건 |
| 업무 상한 | **7개, 권장 3~5** | 화면정의 S2 |

## DESIGN → DO → CHECK → ACT
`.bkit/checkpoints/` 참조

## DESIGN (2026-09-09)

### 모듈 경계
```
lib/task-matrix.ts     직종 18 × 업무 프리셋 44 (exposure·composition·category·defaultHours)
lib/shift-types.ts     16유형 정의 + 축→유형 사상 + 인접 유형(F2)
lib/diagnosis-engine.ts  scoreTasks → axesOf → typeOf → 지도/절감/문구
lib/estimate.ts        점추정 하나를 "어떻게 말할 것인가" (D3 범위 표기)
lib/pairing.ts         4분면×4분면 16조합 + 범주 교집합
lib/diagnosis-store.ts RPC 래퍼 (익명 테이블 권한 0)
```

### 화면
```
flow/Landing(S0) → flow/OccupationPicker(S1) → flow/TaskSheet(S2+S3, D2)
  → flow/PurposePicker(S4) → [D1: S5 없음] → ResultReport(S6)
      ├ ShareSheet(S7, 3종 + 지목)
      ├ PairInvite(S8a) → /p/{id} PairingPage → PairView(S8b)
      ├ TypeChallenge(F2)
      └ SubscribeOptions(S9)
flow/ExitIntentSheet(E1) · /r/{id} SharedResult · /admin AdminDashboard
```

### 데이터 (마이그레이션 3건)
`diagnoses` · `pairings` · `pairing_emails` · `occupation_misses` · `challenge_feedback`
쓰기는 전부 SECURITY DEFINER RPC. 익명 INSERT 정책 0건 (R1~R3 의 교훈).
공개 조회는 요약(범주명)만 — 업무명 원문은 애초에 저장하지 않는다.

## DO (2026-09-09)

삭제: MBTIGrid · RoutineInput · AnalysisAnimation · ResultDashboard · ShareCards ·
CommunityRanking · AccuracyFeedback · EmailSignup · analysis-engine · algorithm-config ·
types(v1) · normalize-activity · classify-activity

## ACT (2026-09-09)

| 대상 | 결과 |
|---|---|
| Supabase | 마이그레이션 6건 적용 (`kimusrivsubyghfhrwng`). 라이브 RPC 전 경로 확인 |
| GitHub | `feat/prd-alignment` 푸시 (commit `3cf6727`) |
| Vercel | https://ai-shift-compass.vercel.app 프로덕션 배포 |
| 동적 OG | `/r/{id}` 가 유형 이름 + 되찾을 시간을 태그로 반환하는 것 실측 확인 |

### 다음 사이클로 넘긴 것
1. **궁합 메일 발송기** — ESP 키 확보 후 Edge Function 1개. 지금은 `pairing_emails` 에 queued 로만 쌓인다
2. **유형별 OG 이미지 16종** — PRD D6 "유형 확정 후 착수". 유형은 이번에 확정됐으니 다음 차례
3. **인터뷰 A3 + B3 (§9-4)** 과 **데이터 라이선스 확인 (§9-3)** — 코드 밖의 일
4. **지인 10명 완주율·정확도 테스트 (§9-10)** — 배포됐으니 바로 가능
5. eslint 미완주 — 이 머신의 메모리 압박. CI나 다른 머신에서 한 번 돌릴 것
