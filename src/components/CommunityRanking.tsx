import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AnalyzedActivity } from "@/lib/types";
import { Trophy } from "lucide-react";

interface CommunityRankingProps {
  activities: AnalyzedActivity[];
}

interface RankedActivity {
  activity_name: string;
  replacement_score: number;
  count: number;
}

// Save activities to ranking table
export async function saveActivitiesToRanking(activities: AnalyzedActivity[]) {
  const validActivities = activities.filter(
    (a) => a.activity.trim() && a.replacement_level !== "human"
  );

  for (const act of validActivities) {
    const name = act.activity.trim();
    if (!name) continue;

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

const MEDAL_COLORS = ["hsl(45, 93%, 47%)", "hsl(0, 0%, 70%)", "hsl(25, 60%, 45%)"];

export default function CommunityRanking({ activities }: CommunityRankingProps) {
  const [items, setItems] = useState<RankedActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    saveActivitiesToRanking(activities);

    const fetchData = async () => {
      const { data, error } = await supabase
        .from("activity_rankings")
        .select("activity_name, replacement_score, count")
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
      <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-2">
        Community Insight
      </p>
      <h3 className="text-lg font-bold text-foreground mb-6">
        다른 유저들이 가장 많이 대체하는 업무
      </h3>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div
            key={item.activity_name}
            className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-secondary/50"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0" style={{ backgroundColor: MEDAL_COLORS[i] + "22" }}>
              <span className="text-sm font-bold" style={{ color: MEDAL_COLORS[i] }}>
                {i + 1}
              </span>
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{item.activity_name}</p>
              <p className="text-xs text-muted-foreground">{item.count}명이 입력</p>
            </div>
            <span
              className="text-xs font-bold px-3 py-1.5 rounded-full text-white shrink-0"
              style={{ backgroundColor: "hsl(0, 72%, 51%)" }}
            >
              {item.replacement_score}%
            </span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground/50 mt-5">
        * 전체 참여자의 활동 데이터를 기반으로 집계됩니다
      </p>
    </div>
  );
}
