import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import PairView from "@/components/PairView";
import { fetchPairing, type PairingRow } from "@/lib/diagnosis-store";
import { trackClick, trackScreenEnter } from "@/lib/analytics";

/**
 * `/p/{id}` — 궁합 (화면정의 S8)
 *
 * 세 가지 상태를 한 페이지가 맡는다.
 *  · 성립 완료 → 겹쳐 본 결과 (PairView)
 *  · 대기 중 · 초대한 사람이 봄 → 링크 복사 + 대기 안내 (§10 "대기 UX" 결정)
 *  · 대기 중 · 초대받은 사람이 봄 → 진단으로 보낸다 (`/?pair={id}`)
 */
export default function PairingPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const isOwner = params.get("owner") === "1";

  const [row, setRow] = useState<PairingRow | null>(null);
  const [loading, setLoading] = useState(true);

  const inviteUrl = `${window.location.origin}/p/${id}`;

  useEffect(() => {
    trackScreenEnter("S8");
    let alive = true;
    (async () => {
      const data = id ? await fetchPairing(id) : null;
      if (alive) {
        setRow(data);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      trackClick("S8", "copy_invite");
      toast({ title: "초대 링크가 복사됐습니다." });
    } catch {
      toast({ title: "복사에 실패했습니다.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-cream border-b border-rule">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <h1 className="text-sm font-semibold text-ink tracking-tight">AI Life Shift</h1>
          <p className="text-[11px] text-faint">겹쳐 보기</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 pb-16">
        {loading ? (
          <p className="pt-16 text-sm text-quiet">불러오는 중…</p>
        ) : !row ? (
          <div className="pt-16">
            <p className="font-voice text-2xl text-ink">초대를 찾지 못했어요</p>
            <p className="text-sm text-body mt-2">링크가 만료됐거나 주소가 잘못됐습니다.</p>
            <Link to="/" className="mt-8 inline-block bg-primary text-primary-foreground px-8 py-3.5 text-sm font-semibold">
              내 일주일 진단해 보기
            </Link>
          </div>
        ) : row.status === "complete" && row.invitee ? (
          <>
            <PairView mine={row.inviter} theirs={row.invitee} />
            <div className="mt-10">
              <Link
                to="/"
                className="block w-full border border-rule py-4 text-sm text-body text-center hover:border-indigo hover:text-indigo transition-colors"
              >
                나도 진단해 보기
              </Link>
            </div>
          </>
        ) : isOwner ? (
          <div className="pt-10" data-testid="pair-waiting">
            <p className="text-xs tracking-widest uppercase text-faint">초대 링크가 만들어졌어요</p>
            <h2 className="font-voice text-2xl text-ink mt-3">상대가 진단을 마치면 겹쳐 보여드릴게요</h2>
            <p className="text-sm text-body mt-3 leading-relaxed">
              결과는 두 분 모두에게 메일로 보내드립니다. 이 페이지는 그대로 두고 나가셔도 돼요.
            </p>

            <p className="mt-7 border border-rule p-4 text-sm text-body break-all">{inviteUrl}</p>
            <button
              onClick={copyInvite}
              data-testid="copy-invite"
              className="mt-3 w-full bg-primary text-primary-foreground py-3.5 text-sm font-semibold"
            >
              초대 링크 복사
            </button>
            <p className="text-xs text-faint mt-4 leading-relaxed">
              상대가 아직 안 했다면 며칠 뒤에 한 번만 알려드릴게요. 재촉 메일은 그 1회가 끝입니다.
            </p>
          </div>
        ) : (
          <div className="pt-10" data-testid="pair-landing">
            <p className="text-xs tracking-widest uppercase text-faint">겹쳐 보자고 초대받으셨어요</p>
            <h2 className="font-voice text-2xl text-ink mt-3 leading-snug">
              {row.inviter?.typeName ?? "상대"} 와 당신의 업무 지도를 겹쳐 봅니다
            </h2>
            <p className="text-sm text-body mt-3 leading-relaxed">
              3분이면 끝나요. 둘 다 아직 안 맡기고 있는 일과, 서로 커버해 주는 부분이 나옵니다.
            </p>
            <Link
              to={`/?pair=${id}`}
              onClick={() => trackClick("S8", "start_from_invite")}
              className="mt-8 block w-full bg-primary text-primary-foreground py-4 text-sm font-semibold text-center"
            >
              내 일주일 진단하기
            </Link>
            <p className="text-xs text-faint mt-4">타이핑 없음 · 3분 · 무료</p>
          </div>
        )}
      </main>
    </div>
  );
}
