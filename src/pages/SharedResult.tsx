import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchPublicDiagnosis, type PublicDiagnosis } from "@/lib/diagnosis-store";
import { trackClick, trackScreenEnter } from "@/lib/analytics";

/**
 * `/r/{id}` — 공유용 결과 페이지 (화면정의 S7)
 *
 * "랜딩이 아니라 내 결과 페이지로 연결." 남이 열면 결과를 보고 하단에 "나도 해보기".
 * 서버가 돌려주는 것은 **요약뿐**이다 — 업무명·시간은 나가지 않는다.
 */
export default function SharedResult() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PublicDiagnosis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackScreenEnter("S7", { diagnosisId: id ?? null });
    let alive = true;
    (async () => {
      const row = id ? await fetchPublicDiagnosis(id) : null;
      if (alive) {
        setData(row);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const summary = data?.summary;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-cream border-b border-rule">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <h1 className="text-sm font-semibold text-ink tracking-tight">AI Life Shift</h1>
          <p className="text-[11px] text-faint">직업이 아니라, 당신의 일주일</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 pb-16">
        {loading ? (
          <p className="pt-16 text-sm text-quiet">불러오는 중…</p>
        ) : !summary ? (
          <div className="pt-16">
            <p className="font-voice text-2xl text-ink">결과를 찾지 못했어요</p>
            <p className="text-sm text-body mt-2">링크가 만료됐거나 주소가 잘못됐습니다.</p>
            <Link to="/" className="mt-8 inline-block bg-primary text-primary-foreground px-8 py-3.5 text-sm font-semibold">
              내 일주일 진단해 보기
            </Link>
          </div>
        ) : (
          <>
            <section className="pt-8 pb-9">
              <p className="text-xs tracking-widest uppercase text-faint mb-3">{summary.occupationLabel}</p>
              <h2 className="font-voice text-3xl sm:text-4xl leading-tight text-ink">{summary.typeName}</h2>
              <p className="text-sm text-body mt-2">{summary.typeLine}</p>

              <p className="mt-9 text-xs tracking-widest uppercase text-faint">되찾을 수 있는 시간</p>
              <p className="font-voice text-5xl text-indigo mt-1">{summary.savedRange}</p>
              <p className="text-xs text-faint mt-3">공개 지표를 참고해 산출한 추정치입니다.</p>
            </section>

            {summary.yoursCategories?.length > 0 && (
              <section className="rule-top pt-8">
                <h3 className="text-lg font-medium text-ink">당신만 할 수 있는 일</h3>
                <p className="text-base text-indigo mt-3">{summary.yoursCategories.join(" · ")}</p>
              </section>
            )}

            {summary.delegableCategories?.length > 0 && (
              <section className="rule-top pt-8">
                <h3 className="text-lg font-medium text-quiet">맡겨도 되는 일</h3>
                <p className="text-base text-body mt-3">{summary.delegableCategories.join(" · ")}</p>
              </section>
            )}

            <p className="rule-top pt-5 mt-8 text-xs text-faint leading-relaxed">
              공유 페이지에는 업무 범주만 표시됩니다. 개별 업무와 시간은 본인만 볼 수 있어요.
            </p>

            <div className="mt-10">
              <Link
                to="/"
                onClick={() => trackClick("S7", "cta_from_shared", { diagnosisId: id ?? null })}
                className="block w-full bg-primary text-primary-foreground py-4 text-sm font-semibold text-center"
              >
                나도 3분만에 해보기
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
