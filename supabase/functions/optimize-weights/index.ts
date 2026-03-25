import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. 최근 낮은 만족도 피드백 조회 (1~2점, 최근 7일)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: lowFeedbacks, error: fbErr } = await supabase
      .from("accuracy_feedback")
      .select("diagnosis_id, accuracy_score, comment, created_at")
      .lte("accuracy_score", 2)
      .gte("created_at", sevenDaysAgo);

    if (fbErr) throw fbErr;

    // 2. 전체 피드백 통계
    const { data: allFeedbacks } = await supabase
      .from("accuracy_feedback")
      .select("accuracy_score")
      .gte("created_at", sevenDaysAgo);

    const totalCount = allFeedbacks?.length || 0;
    const lowCount = lowFeedbacks?.length || 0;

    if (totalCount < 5) {
      return new Response(JSON.stringify({
        status: "skipped",
        reason: "최근 7일간 피드백 5건 미만 — 조정 불필요",
        totalCount,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const dissatisfactionRate = lowCount / totalCount;

    // 3. 현재 config 가져오기
    const { data: configs } = await supabase
      .from("algorithm_config")
      .select("config_key, config_value");

    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({
        status: "skipped",
        reason: "algorithm_config 데이터 없음",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const configMap = new Map(configs.map((c: any) => [c.config_key, Number(c.config_value)]));
    const adjustments: { key: string; oldValue: number; newValue: number; reason: string }[] = [];

    // 4. 불만족률 기반 가중치 자동 조정 (0.01 단위)
    if (dissatisfactionRate > 0.3) {
      // 불만족 30% 초과 → 생산성 카테고리의 대체 점수를 약간 하향
      const keysToAdjust = [
        "replacement_score.전문업무_기본",
        "replacement_score.전문업무_코딩",
        "replacement_score.전문업무_기획",
      ];

      for (const key of keysToAdjust) {
        const current = configMap.get(key);
        if (current !== undefined && current > 10) {
          const newVal = Math.round((current - 1) * 100) / 100; // -1점 (0.01 단위 정밀)
          adjustments.push({ key, oldValue: current, newValue: newVal, reason: `불만족률 ${(dissatisfactionRate * 100).toFixed(0)}% → 하향 조정` });
        }
      }
    } else if (dissatisfactionRate < 0.1 && totalCount >= 10) {
      // 불만족 10% 미만 + 충분한 데이터 → 소폭 상향 (더 공격적 진단)
      const keysToAdjust = [
        "replacement_score.단순행정",
        "replacement_score.소셜미디어",
      ];

      for (const key of keysToAdjust) {
        const current = configMap.get(key);
        if (current !== undefined && current < 99) {
          const newVal = Math.round((current + 0.5) * 100) / 100;
          adjustments.push({ key, oldValue: current, newValue: newVal, reason: `만족도 높음 → 소폭 상향` });
        }
      }
    }

    // 도파민 잠식 가중치 조정
    if (dissatisfactionRate > 0.4) {
      const currentDopamine = configMap.get("dopamine_erosion_factor");
      if (currentDopamine && currentDopamine > 1.0) {
        const newVal = Math.round((currentDopamine - 0.01) * 100) / 100;
        adjustments.push({ key: "dopamine_erosion_factor", oldValue: currentDopamine, newValue: newVal, reason: "높은 불만족률 → 잠식 가중치 완화" });
      }
    }

    // 5. DB 업데이트
    for (const adj of adjustments) {
      await supabase
        .from("algorithm_config")
        .update({ config_value: adj.newValue, updated_at: new Date().toISOString(), updated_by: "auto-optimizer" })
        .eq("config_key", adj.key);
    }

    const result = {
      status: "completed",
      totalFeedbacks: totalCount,
      lowSatisfactionCount: lowCount,
      dissatisfactionRate: (dissatisfactionRate * 100).toFixed(1) + "%",
      adjustmentsApplied: adjustments.length,
      adjustments,
      timestamp: new Date().toISOString(),
    };

    console.log("[optimize-weights] 실행 완료:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[optimize-weights] 오류:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
