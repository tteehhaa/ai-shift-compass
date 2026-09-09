# AI Life Shift

**직업이 아니라, 당신의 일주일을 진단합니다.**

내가 돈 받고 하는 일 위에 AI를 얹어 보고, 뭘 맡기고 뭐에 집중할지 3분 안에 알려 주는 무료 진단.

기준 문서: [`docs/class/PRD.md`](docs/class/PRD.md) · [`docs/class/화면정의.md`](docs/class/화면정의.md) · [`docs/class/유형16.md`](docs/class/유형16.md)

---

## 흐름

```
S0 랜딩 → S1 직종 → S2+S3 업무·시간 → S4 목적 → S6 결과
                                                  ├→ S7 공유 + 지목
                                                  ├→ S8 궁합 초대 → /p/{id}
                                                  └→ S9 이메일 (선택)
```

타이핑 0회, 목표 3분. **S5(계산 중) 화면은 두지 않는다** — PRD 3.6 D1.
**S2와 S3는 한 화면이다** — D2. 체크하면 그 자리에서 슬라이더가 펼쳐진다.

## 구조

| 경로 | 역할 |
|---|---|
| `src/lib/task-matrix.ts` | 직종 18개 × 업무 프리셋 44개. 차별점의 재료 |
| `src/lib/shift-types.ts` | 16유형 (`유형16.md`) + 축→유형 사상 + 인접 유형 |
| `src/lib/diagnosis-engine.ts` | 노출도 × 활용도 × 구성 × 밀도 → 유형·업무 지도·절감 추정 |
| `src/lib/estimate.ts` | 점추정을 범위로 옮기는 표기 규칙 (D3) |
| `src/lib/pairing.ts` | 궁합 — 4분면 × 4분면 16조합 |
| `src/lib/diagnosis-store.ts` | Supabase RPC 래퍼. 익명 테이블 권한은 0 |
| `src/components/flow/` | S0·S1·S2+S3·S4·E1 |
| `src/components/ResultReport.tsx` | S6 결과 7섹션 |
| `api/og.js` | `/r/{id}` 동적 OG 태그 |

## 원칙 (코드에 박혀 있는 것)

- **확정 금액·대체 연도·공포 문구를 쓰지 않는다.** 절감량은 항상 범위 (`formatHourRange`)
- **강조는 강점 쪽에.** "당신만 할 수 있는 일"이 먼저·딥 인디고, "맡겨도 되는 일"은 아래 무채색
- **결과 앞에 게이트가 없다.** 이메일은 결과를 다 본 뒤 S9(선택)와 S8(궁합, 필수)에서만
- **개인 업무명 원문은 서버에 저장하지 않는다.** 프리셋 id 만 남고, 공유·궁합은 범주명만
- **쓰기는 전부 SECURITY DEFINER RPC.** 익명 INSERT/UPDATE 정책을 열지 않는다

## 개발

```bash
npm install
npm run dev        # http://localhost:8080
npm test           # vitest
npm run build
```

`.env` 는 `.env.example` 참고. anon 키는 공개돼도 되는 키이고, 보호는 RLS가 한다.

## 데이터베이스

```bash
supabase db push                       # 마이그레이션 적용
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

| 테이블 | 용도 |
|---|---|
| `diagnoses` | 진단 결과. tasks 는 프리셋 id·시간·사용정도만 |
| `pairings` / `pairing_emails` | 궁합과 발송 대기열 |
| `challenge_feedback` | F2 반박 버튼 |
| `occupation_misses` | 직종 미발견 검색어 |
| `analytics_events` | 화면 진입·이탈·클릭 |

## 아직 안 된 것

- 궁합 결과 **메일 발송기**(ESP)가 연결돼 있지 않다. 이메일은 `pairing_emails` 에 `queued` 로 쌓이고, 결과는 `/p/{id}` 링크로 본다
- OG 이미지는 브랜드 기본 1종. 유형별 사전 제작은 PRD D6 대로 유형 확정 후 착수
- 인터뷰(PRD §9-4)와 데이터 라이선스 확인(§9-3)은 코드 밖의 일로 남아 있다
