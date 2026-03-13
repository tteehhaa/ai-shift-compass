import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";
import type { AnalyzedActivity } from "@/lib/types";
import { REPLACEMENT_COLORS } from "@/lib/analysis-engine";

interface CommunityRankingProps {
  activities: AnalyzedActivity[];
}

interface RankingItem {
  activity_name: string;
  replacement_score: number;
  replacement_level: string;
  count: number;
}

// Save high-score activities to the ranking table
export async function saveActivitiesToRanking(activities: AnalyzedActivity[]) {
  const highScoreActivities = activities.filter(
    (a) => a.replacement_score >= 60 && a.replacement_level !== "human"
  );

  for (const act of highScoreActivities) {
    const name = act.activity.trim();
    if (!name) continue;

    // Try to upsert: increment count if exists, insert if not
    const { data: existing } = await supabase
      .from("activity_rankings")
      .select("id, count")
      .eq("activity_name", name)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("activity_rankings")
        .update({
          count: existing.count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("activity_rankings").insert({
        activity_name: name,
        replacement_score: act.replacement_score,
        replacement_level: act.replacement_level,
        category: act.category,
      });
    }
  }
}

export default function CommunityRanking({ activities }: CommunityRankingProps) {
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Save current user's activities
    saveActivitiesToRanking(activities);

    // Fetch top rankings
    const fetchRankings = async () => {
      const { data, error } = await supabase
        .from("activity_rankings")
        .select("activity_name, replacement_score, replacement_level, count")
        .order("count", { ascending: false })
        .limit(3);

      if (!error && data) {
        setRankings(data);
      }
      setLoading(false);
    };

    fetchRankings();
  }, []);

  if (loading || rankings.length === 0) return null;

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="glass-card rounded-3xl p-8">
      <div className="text-center mb-5">
        <Trophy className="w-6 h-6 mx-auto mb-2 text-amber-500" />
        <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-1">Community Insight</p>
        <h3 className="text-base font-bold text-foreground">다른 유저들이 가장 많이 대체하는 업무</h3>
      </div>

      <div className="space-y-3">
        {rankings.map((item, i) => {
          const color = REPLACEMENT_COLORS[item.replacement_level] || REPLACEMENT_COLORS.high;
          return (
            <div
              key={item.activity_name}
              className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/50"
            >
              <span className="text-xl shrink-0">{medals[i]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.activity_name}</p>
                <p className="text-[11px] text-muted-foreground">{item.count}명이 입력</p>
              </div>
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full text-white shrink-0"
                style={{ backgroundColor: color }}
              >
                {item.replacement_score}%
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground/50 text-center mt-4">
        * 전체 참여자의 활동 데이터를 기반으로 집계됩니다
      </p>
    </div>
  );
}
