import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AnalyzedActivity } from "@/lib/types";
import { Trophy, Medal } from "lucide-react";
import { REPLACEMENT_COLORS, REPLACEMENT_LABELS } from "@/lib/analysis-engine";
import { normalizeActivityName } from "@/lib/normalize-activity";

interface CommunityRankingProps {
  activities: AnalyzedActivity[];
}

interface RankedActivity {
  activity_name: string;
  replacement_level: string;
  replacement_score: number;
  count: number;
}

// Save activities to ranking table with normalized names
export async function saveActivitiesToRanking(activities: AnalyzedActivity[]) {
  const validActivities = activities.filter(
    (a) => a.activity.trim() && a.replacement_level !== "human"
  );

  // R3: 익명 INSERT/UPDATE 대신 집계 전용 RPC를 호출한다.
  // count 증가가 서버에서 원자적으로 일어나므로 read-then-update 경합도 사라진다.
  for (const act of validActivities) {
    const normalized = normalizeActivityName(act.activity);
    if (!normalized) continue;

    const { error } = await supabase.rpc("bump_activity_ranking", {
      _activity_name: normalized,
      _replacement_score: act.replacement_score,
      _replacement_level: act.replacement_level,
      _category: act.category,
    });

    if (error) console.error("[ranking] bump failed:", error.message);
  }
}

const MEDAL_COLORS = ["hsl(45, 93%, 47%)", "hsl(0, 0%, 70%)", "hsl(25, 60%, 45%)"];

export default function CommunityRanking({ activities }: CommunityRankingProps) {
  const [items, setItems] = useState<RankedActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    saveActivitiesToRanking(activities);

    const fetchData = async () => {
      const { data, error } = await supabase
        .from("activity_rankings")
        .select("activity_name, replacement_level, replacement_score, count")
        .order("count", { ascending: false })
        .limit(3);

      if (error || !data) {
        setLoading(false);
        return;
      }

      setItems(data);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading || items.length === 0) return null;

  return (
    <div className="glass-card rounded-3xl p-8 text-center">
      <Trophy className="w-8 h-8 mx-auto mb-3" style={{ color: "hsl(25, 90%, 50%)" }} />
      <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-6">
        Community Insight
      </p>

      <div className="space-y-3">
        {items.map((item, i) => {
          const levelColor = REPLACEMENT_COLORS[item.replacement_level] || "hsl(0, 0%, 50%)";
          const levelLabel = REPLACEMENT_LABELS[item.replacement_level] || item.replacement_level;
          return (
            <div
              key={item.activity_name}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-secondary/50"
            >
              <Medal className="w-6 h-6 shrink-0" style={{ color: MEDAL_COLORS[i] }} />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{item.activity_name}</p>
                <p className="text-xs text-muted-foreground">{item.count}명이 입력</p>
              </div>
              <span
                className="text-[11px] font-bold px-3 py-1.5 rounded-full text-white shrink-0"
                style={{ backgroundColor: levelColor }}
              >
                {levelLabel}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground/50 mt-5">
        * 전체 참여자의 활동 데이터를 기반으로 집계됩니다
      </p>
    </div>
  );
}
