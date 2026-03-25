import { supabase } from "@/integrations/supabase/client";

export interface LLMClassification {
  category: string;
  replacement_score: number;
  recommended_tool: string;
  reason: string;
  icon: string;
}

/**
 * keywordRules에 매칭되지 않는 활동을 LLM으로 분류하고 도구를 추천합니다.
 * 네트워크 실패 시 fallback을 반환합니다.
 */
export async function classifyUnknownActivity(
  activity: string,
  tag: string,
): Promise<LLMClassification> {
  try {
    const { data, error } = await supabase.functions.invoke("classify-activity", {
      body: { activity, tag },
    });

    if (error) throw error;

    if (data?.success && data?.classification) {
      return data.classification;
    }

    // Fallback from edge function error response
    if (data?.classification) {
      return data.classification;
    }

    throw new Error("No classification returned");
  } catch (e) {
    console.warn("[classifyUnknownActivity] 실패, 기본값 사용:", e);
    return {
      category: "기타",
      replacement_score: 30,
      recommended_tool: "AI 업무 효율화 도구",
      reason: "이 활동에 AI를 도입하면 효율을 높일 수 있습니다.",
      icon: "🤖",
    };
  }
}
