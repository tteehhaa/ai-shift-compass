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

    // ======== A. 피드백 기반 분석 (기존) ========
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: allFeedbacks } = await supabase
      .from("accuracy_feedback")
      .select("accuracy_score, comment, created_at")
      .gte("created_at", sevenDaysAgo);

    const totalFeedbacks = allFeedbacks?.length || 0;
    const lowFeedbacks = allFeedbacks?.filter((f: any) => f.accuracy_score <= 2) || [];
    const lowCount = lowFeedbacks.length;
    const dissatisfactionRate = totalFeedbacks > 0 ? lowCount / totalFeedbacks : 0;

    // ======== B. 진단 데이터 통계 기반 분석 (신규) ========
    const { data: diagnosisData } = await supabase
      .from("diagnosis_results")
      .select("result_data, routines, shift_index, created_at")
      .gte("created_at", sevenDaysAgo);

    const totalDiagnoses = diagnosisData?.length || 0;

    // 카테고리별 활동 빈도 집계
    const categoryFrequency: Record<string, number> = {};
    const categoryTotalMinutes: Record<string, number> = {};
    const shiftIndices: number[] = [];

    for (const d of (diagnosisData || []) as any[]) {
      shiftIndices.push(d.shift_index);
      const routines = d.routines;
      if (Array.isArray(routines)) {
        for (const r of routines) {
          const cat = r.category || "기타";
          categoryFrequency[cat] = (categoryFrequency[cat] || 0) + 1;
          categoryTotalMinutes[cat] = (categoryTotalMinutes[cat] || 0) + (r.duration || 0);
        }
      }
    }

    const avgShiftIndex = shiftIndices.length > 0
      ? Math.round(shiftIndices.reduce((a, b) => a + b, 0) / shiftIndices.length)
      : 0;

    // 카테고리별 평균 시간 산출
    const categoryAvgMinutes: Record<string, number> = {};
    for (const [cat, total] of Object.entries(categoryTotalMinutes)) {
      categoryAvgMinutes[cat] = Math.round(total / (categoryFrequency[cat] || 1));
    }

    // ======== C. 현재 config 가져오기 ========
    const { data: configs } = await supabase
      .from("algorithm_config")
      .select("config_key, config_value");

    const configMap = new Map((configs || []).map((c: any) => [c.config_key, Number(c.config_value)]));
    const adjustments: { key: string; oldValue: number; newValue: number; reason: string }[] = [];

    // ======== D. 피드백 기반 조정 (기존, 제약조건 제거) ========
    if (totalFeedbacks >= 1) {
      if (dissatisfactionRate > 0.3) {
        const keysToAdjust = [
          "replacement_score.전문업무_기본",
          "replacement_score.전문업무_코딩",
          "replacement_score.전문업무_기획",
        ];
        for (const key of keysToAdjust) {
          const current = configMap.get(key);
          if (current !== undefined && current > 10) {
            const newVal = Math.round((current - 1) * 100) / 100;
            adjustments.push({ key, oldValue: current, newValue: newVal, reason: `피드백 불만족률 ${(dissatisfactionRate * 100).toFixed(0)}% → 하향 조정` });
          }
        }
      } else if (dissatisfactionRate < 0.1) {
        const keysToAdjust = ["replacement_score.단순행정", "replacement_score.소셜미디어"];
        for (const key of keysToAdjust) {
          const current = configMap.get(key);
          if (current !== undefined && current < 99) {
            const newVal = Math.round((current + 0.5) * 100) / 100;
            adjustments.push({ key, oldValue: current, newValue: newVal, reason: `피드백 만족도 높음 → 소폭 상향` });
          }
        }
      }

      if (dissatisfactionRate > 0.4) {
        const currentDopamine = configMap.get("dopamine_erosion_factor");
        if (currentDopamine && currentDopamine > 1.0) {
          const newVal = Math.round((currentDopamine - 0.01) * 100) / 100;
          adjustments.push({ key: "dopamine_erosion_factor", oldValue: currentDopamine, newValue: newVal, reason: "높은 불만족률 → 도파민 가중치 완화" });
        }
      }
    }

    // ======== E. 진단 데이터 통계 기반 제안 (신규) ========
    const dataInsights: { category: string; frequency: number; avgMinutes: number; suggestion: string }[] = [];

    if (totalDiagnoses >= 1) {
      // 가장 빈번한 카테고리 Top 5
      const sortedCategories = Object.entries(categoryFrequency)
        .sort((a, b) => b[1] - a[1]);

      for (const [cat, freq] of sortedCategories.slice(0, 8)) {
        const avgMin = categoryAvgMinutes[cat] || 0;
        let suggestion = "";

        // 높은 빈도 + 높은 시간 → 핵심 업무 카테고리
        if (freq >= 3 && avgMin >= 60) {
          suggestion = `핵심 업무 카테고리. 대체 점수 정밀도가 중요합니다.`;
        } else if (freq >= 3 && avgMin < 30) {
          suggestion = `자주 입력되지만 단시간 수행. 대체 점수 재검토 권장.`;
        } else if (freq === 1 && avgMin >= 120) {
          suggestion = `장시간 수행이나 1회 입력. 추가 데이터 필요.`;
        } else {
          suggestion = `일반적 빈도. 현재 가중치 유지 가능.`;
        }

        dataInsights.push({ category: cat, frequency: freq, avgMinutes: avgMin, suggestion });
      }

      // 시프트 지수 분포 기반 제안
      if (avgShiftIndex > 70) {
        const key = "replacement_score.단순행정";
        const current = configMap.get(key);
        if (current && current < 95 && !adjustments.find(a => a.key === key)) {
          adjustments.push({
            key, oldValue: current,
            newValue: Math.round((current + 0.5) * 100) / 100,
            reason: `평균 시프트 지수 ${avgShiftIndex}%로 높음 → 단순행정 가중치 소폭 상향`
          });
        }
      } else if (avgShiftIndex < 30 && avgShiftIndex > 0) {
        const key = "replacement_score.전문업무_기본";
        const current = configMap.get(key);
        if (current && current > 20 && !adjustments.find(a => a.key === key)) {
          adjustments.push({
            key, oldValue: current,
            newValue: Math.round((current - 0.5) * 100) / 100,
            reason: `평균 시프트 지수 ${avgShiftIndex}%로 낮음 → 전문업무 가중치 소폭 하향`
          });
        }
      }
    }

    // ======== F. DB 업데이트 ========
    for (const adj of adjustments) {
      await supabase
        .from("algorithm_config")
        .update({ config_value: adj.newValue, updated_at: new Date().toISOString(), updated_by: "auto-optimizer" })
        .eq("config_key", adj.key);
    }

    const result = {
      status: "completed",
      // 피드백 기반
      totalFeedbacks,
      lowSatisfactionCount: lowCount,
      dissatisfactionRate: totalFeedbacks > 0 ? (dissatisfactionRate * 100).toFixed(1) + "%" : "N/A",
      // 진단 데이터 기반
      totalDiagnoses,
      avgShiftIndex,
      categoryFrequency,
      categoryAvgMinutes,
      dataInsights,
      // 조정 결과
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
