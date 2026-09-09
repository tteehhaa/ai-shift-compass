import { useState } from "react";
import { Search } from "lucide-react";
import { OCCUPATIONS } from "@/lib/task-matrix";

/**
 * S1. 직종 선택 — 화면정의 S1
 *
 * 칩 18개, 2열. 검색창은 기본 숨김(칩에 없을 때만).
 * "직종을 못 찾은 사용자 비율을 반드시 계측할 것" → onMiss 로 검색어를 올린다.
 */
interface Props {
  onSelect: (occupationId: string) => void;
  onMiss: (term: string) => void;
}

export default function OccupationPicker({ onSelect, onMiss }: Props) {
  const [searching, setSearching] = useState(false);
  const [term, setTerm] = useState("");

  const matches = term.trim()
    ? OCCUPATIONS.filter((o) => o.label.includes(term.trim()))
    : OCCUPATIONS;

  const handleSearchBlur = () => {
    const t = term.trim();
    // 검색했는데 걸리는 칩이 없으면 미발견으로 본다
    if (t.length >= 2 && matches.length === 0) onMiss(t);
  };

  return (
    <div className="pt-6 pb-16">
      <p className="text-xs tracking-widest uppercase text-faint">1 / 3</p>
      <h2 className="font-voice text-2xl text-ink mt-3 mb-6">어떤 일을 하고 계세요?</h2>

      <div className="grid grid-cols-2 gap-2">
        {matches.map((o) => (
          <button
            key={o.id}
            onClick={() => onSelect(o.id)}
            data-testid={`occupation-${o.id}`}
            className="border border-rule px-4 py-3 text-sm text-body text-left transition-colors hover:border-indigo hover:text-indigo"
          >
            {o.label}
          </button>
        ))}
      </div>

      {matches.length === 0 && (
        <p className="mt-4 text-sm text-body">
          딱 맞는 게 없으면 <span className="text-indigo">가장 비슷한 것</span>을 골라 주세요. 업무 목록은
          다음 화면에서 직접 고릅니다.
        </p>
      )}

      <div className="mt-8 rule-top pt-5">
        {searching ? (
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onBlur={handleSearchBlur}
            placeholder="직종 검색"
            className="w-full bg-transparent border-b border-rule pb-2 text-sm text-ink outline-none focus:border-indigo"
          />
        ) : (
          <button
            onClick={() => setSearching(true)}
            className="inline-flex items-center gap-1.5 text-xs text-quiet hover:text-indigo-soft transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            목록에 없어요
          </button>
        )}
      </div>
    </div>
  );
}
