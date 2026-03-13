import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AnalyzedActivity } from "@/lib/types";

interface CommunityRankingProps {
  activities: AnalyzedActivity[];
}

interface CategoryTop {
  label: string;
  activity: string;
  color: string;
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

// Map replacement_level to 3 categories
function getCategory(level: string): "risk" | "assist" | "human" | null {
  if (["critical", "high"].includes(level)) return "risk";
  if (["medium", "low", "assist"].includes(level)) return "assist";
  if (level === "human") return "human";
  return null;
}

export default function CommunityRanking({ activities }: CommunityRankingProps) {
  const [items, setItems] = useState<CategoryTop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    saveActivitiesToRanking(activities);

    const fetchData = async () => {
      const { data, error } = await supabase
        .from("activity_rankings")
        .select("activity_name, replacement_level, count")
        .order("count", { ascending: false });

      if (error || !data) {
        setLoading(false);
        return;
      }

      const buckets: Record<string, { activity: string; count: number }> = {};

      for (const row of data) {
        const cat = getCategory(row.replacement_level);
        if (!cat) continue;
        if (!buckets[cat] || row.count > buckets[cat].count) {
          buckets[cat] = { activity: row.activity_name, count: row.count };
        }
      }

      const config: Record<string, { label: string; color: string }> = {
        risk: { label: "AI 대체 위험", color: "hsl(0, 72%, 51%)" },
        assist: { label: "AI 보조 활용", color: "hsl(45, 93%, 47%)" },
        human: { label: "인간 고유 영역", color: "hsl(142, 71%, 45%)" },
      };

      const result: CategoryTop[] = [];
      for (const key of ["risk", "assist", "human"] as const) {
        if (buckets[key]) {
          result.push({
            label: config[key].label,
            activity: buckets[key].activity,
            color: config[key].color,
          });
        }
      }

      setItems(result);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading || items.length === 0) return null;

  return (
    <div className="glass-card rounded-3xl p-6">
      <p className="text-[11px] font-medium text-muted-foreground tracking-widest uppercase mb-4">
        전체 진단 통계 (Live Data)
      </p>

      <div className="divide-y divide-border">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
            <span className="text-xs font-semibold text-foreground">{item.activity}</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground/50 text-right mt-3">
        실시간 누적 진단 데이터 기준
      </p>
    </div>
  );
}
