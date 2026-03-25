import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { activity, tag } = await req.json();

    if (!activity || typeof activity !== "string") {
      return new Response(JSON.stringify({ error: "activity is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `당신은 업무 활동 분류 전문가입니다. 사용자가 입력한 활동을 분석하고 적절한 AI 도구를 추천해주세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "category": "활동 카테고리 (커뮤니케이션/데이터분석/콘텐츠제작/개발/리서치/디자인/관리/기타)",
  "replacement_score": 0-100 사이의 AI 대체 가능성 점수,
  "recommended_tool": "추천 AI 도구 이름",
  "reason": "이 도구를 추천하는 이유 (한 문장)",
  "icon": "적절한 이모지 하나"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `활동: "${activity}"\n태그: ${tag || "미지정"}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "크레딧이 부족합니다." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) throw new Error("AI 응답 없음");

    // Parse JSON from AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI 응답 파싱 실패");

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({
      success: true,
      classification: {
        category: parsed.category || "기타",
        replacement_score: Math.min(100, Math.max(0, Number(parsed.replacement_score) || 50)),
        recommended_tool: parsed.recommended_tool || "범용 AI 도구",
        reason: parsed.reason || "이 활동에 AI를 활용하면 효율을 높일 수 있습니다.",
        icon: parsed.icon || "🤖",
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[classify-activity] 오류:", e);
    return new Response(JSON.stringify({
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
      // Fallback classification
      classification: {
        category: "기타",
        replacement_score: 30,
        recommended_tool: "AI 업무 효율화 도구",
        reason: "분류에 실패했지만, 일반적인 AI 도구로 업무 효율을 높일 수 있습니다.",
        icon: "🤖",
      },
    }), {
      status: 200, // Return 200 with fallback so UI doesn't break
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
