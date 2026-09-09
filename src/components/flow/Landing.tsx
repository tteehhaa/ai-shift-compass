import { ArrowRight } from "lucide-react";

/**
 * S0. 랜딩 — 화면정의 S0
 *
 * 5초 안에 "필요하고 안 귀찮다". 서비스 설명 문단·로그인·이메일 수집은 금지.
 * 배지 문구는 PRD 3.5 결정에 따라 "가입 없음"을 뺀 3개다.
 */
export default function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="pt-10 pb-16">
      <h2 className="font-voice text-3xl sm:text-4xl leading-snug text-ink">
        직업이 아니라,
        <br />
        당신의 일주일을 진단합니다
      </h2>

      <p className="mt-5 text-base text-body leading-relaxed">
        3분이면, 이번 주에 되찾을 수 있는 시간이 나옵니다.
      </p>

      <p className="mt-3 text-xs tracking-widest uppercase text-faint">타이핑 없음 · 3분 · 무료</p>

      <button
        onClick={onStart}
        data-testid="start-diagnosis"
        className="mt-8 w-full sm:w-auto sm:px-10 bg-primary text-primary-foreground py-4 px-6 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
      >
        진단 시작
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* 결과 예시 — 실제 결과의 최상단 블록을 축소해 그대로 보여준다 */}
      <div className="mt-14 rule-top pt-8">
        <p className="text-xs tracking-widest uppercase text-faint mb-4">결과는 이렇게 나옵니다</p>
        <div className="border border-rule p-6 bg-cream">
          <p className="text-xs text-faint mb-2">디자이너 · 프리랜서</p>
          <p className="font-voice text-2xl text-ink">조용한 정비공</p>
          <p className="text-sm text-body mt-1">맡길 게 많은데, 아직 손에 익은 대로 하는 중</p>
          <p className="mt-6 text-xs tracking-widest uppercase text-faint">되찾을 수 있는 시간</p>
          <p className="font-voice text-4xl text-indigo mt-1">주 5~8시간</p>
          <p className="text-xs text-faint mt-2">공개 지표를 참고해 산출한 추정치입니다.</p>
        </div>
      </div>
    </div>
  );
}
