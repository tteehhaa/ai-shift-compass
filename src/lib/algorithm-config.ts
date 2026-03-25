import { supabase } from "@/integrations/supabase/client";

export interface AlgorithmConfig {
  replacementScores: {
    단순행정: number;
    자기계발: number;
    전문업무_코딩: number;
    전문업무_기획: number;
    전문업무_기본: number;
    소셜미디어: number;
    미디어감상: number;
    오프라인: number;
    생활루틴: number;
  };
  compressionRates: {
    전문업무: number;
    단순행정: number;
    자기계발: number;
    기본: number;
  };
  dopamineErosionFactor: number;
  hourlyValue: number;
}

// Default fallback values (same as current hardcoded)
export const DEFAULT_CONFIG: AlgorithmConfig = {
  replacementScores: {
    단순행정: 85,
    자기계발: 70,
    전문업무_코딩: 60,
    전문업무_기획: 45,
    전문업무_기본: 55,
    소셜미디어: 92,
    미디어감상: 88,
    오프라인: 5,
    생활루틴: 10,
  },
  compressionRates: {
    전문업무: 4.5,
    단순행정: 5.0,
    자기계발: 4.0,
    기본: 1.0,
  },
  dopamineErosionFactor: 1.2,
  hourlyValue: 10030,
};

let cachedConfig: AlgorithmConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchAlgorithmConfig(): Promise<AlgorithmConfig> {
  const now = Date.now();
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const { data, error } = await supabase
      .from("algorithm_config" as any)
      .select("config_key, config_value");

    if (error || !data || (data as any[]).length === 0) {
      console.warn("[AlgorithmConfig] DB 조회 실패, 기본값 사용:", error?.message);
      return DEFAULT_CONFIG;
    }

    const map = new Map<string, number>();
    for (const row of data as any[]) {
      map.set(row.config_key, Number(row.config_value));
    }

    const config: AlgorithmConfig = {
      replacementScores: {
        단순행정: map.get("replacement_score.단순행정") ?? DEFAULT_CONFIG.replacementScores.단순행정,
        자기계발: map.get("replacement_score.자기계발") ?? DEFAULT_CONFIG.replacementScores.자기계발,
        전문업무_코딩: map.get("replacement_score.전문업무_코딩") ?? DEFAULT_CONFIG.replacementScores.전문업무_코딩,
        전문업무_기획: map.get("replacement_score.전문업무_기획") ?? DEFAULT_CONFIG.replacementScores.전문업무_기획,
        전문업무_기본: map.get("replacement_score.전문업무_기본") ?? DEFAULT_CONFIG.replacementScores.전문업무_기본,
        소셜미디어: map.get("replacement_score.소셜미디어") ?? DEFAULT_CONFIG.replacementScores.소셜미디어,
        미디어감상: map.get("replacement_score.미디어감상") ?? DEFAULT_CONFIG.replacementScores.미디어감상,
        오프라인: map.get("replacement_score.오프라인") ?? DEFAULT_CONFIG.replacementScores.오프라인,
        생활루틴: map.get("replacement_score.생활루틴") ?? DEFAULT_CONFIG.replacementScores.생활루틴,
      },
      compressionRates: {
        전문업무: map.get("compression_rate.전문업무") ?? DEFAULT_CONFIG.compressionRates.전문업무,
        단순행정: map.get("compression_rate.단순행정") ?? DEFAULT_CONFIG.compressionRates.단순행정,
        자기계발: map.get("compression_rate.자기계발") ?? DEFAULT_CONFIG.compressionRates.자기계발,
        기본: map.get("compression_rate.기본") ?? DEFAULT_CONFIG.compressionRates.기본,
      },
      dopamineErosionFactor: map.get("dopamine_erosion_factor") ?? DEFAULT_CONFIG.dopamineErosionFactor,
      hourlyValue: map.get("hourly_value") ?? DEFAULT_CONFIG.hourlyValue,
    };

    cachedConfig = config;
    cacheTimestamp = now;
    return config;
  } catch (e) {
    console.warn("[AlgorithmConfig] 예외 발생, 기본값 사용:", e);
    return DEFAULT_CONFIG;
  }
}
