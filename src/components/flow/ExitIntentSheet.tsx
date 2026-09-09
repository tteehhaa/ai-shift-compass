/**
 * E1. 이탈 방지 시트 — 화면정의 E1
 *
 * S2·S3(통합 화면)에서 뒤로가기 또는 30초 무동작에 **1회만** 뜬다.
 * "과하면 역효과"이므로 세션당 한 번으로 제한하는 책임은 호출하는 쪽에 있다.
 */
interface Props {
  onContinue: () => void;
  onLeave: () => void;
}

export default function ExitIntentSheet({ onContinue, onLeave }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/20 px-5">
      <div className="w-full max-w-md bg-cream border border-rule p-7" role="dialog" aria-modal="true">
        <p className="font-voice text-xl text-ink">여기까지 왔는데 아깝잖아요</p>
        <p className="text-sm text-body mt-2">30초면 끝나요. 남은 건 목적 하나 고르는 것뿐입니다.</p>
        <div className="mt-7 flex gap-3">
          <button
            onClick={onContinue}
            data-testid="exit-continue"
            className="flex-1 bg-primary text-primary-foreground py-3 text-sm font-semibold"
          >
            계속하기
          </button>
          <button onClick={onLeave} data-testid="exit-leave" className="px-5 text-sm text-quiet">
            나가기
          </button>
        </div>
      </div>
    </div>
  );
}
