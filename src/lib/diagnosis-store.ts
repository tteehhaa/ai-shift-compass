import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { DiagnosisResult, PublicSummary } from "./diagnosis-types";
import { toPublicSummary } from "./diagnosis-engine";

/**
 * 저장·조회 경로. 전부 SECURITY DEFINER RPC 를 거친다 —
 * 익명 테이블 권한을 열지 않는 것이 R1~R3 의 교훈이다.
 *
 * 서버로 나가는 업무 정보는 **프리셋 id 와 시간·사용 정도**뿐이고,
 * 공유·궁합으로 나가는 것은 **범주명 요약**뿐이다 (화면정의 S7/S8).
 */

/** diagnoses.tasks 에 들어가는 압축 표현 */
function packTasks(result: DiagnosisResult): Json {
  return result.tasks.map((t) => ({
    t: t.taskId,
    h: t.hoursPerWeek,
    u: t.usage,
    s: t.side,
  })) as unknown as Json;
}

export async function saveDiagnosis(result: DiagnosisResult): Promise<string | null> {
  const id = crypto.randomUUID();
  const { error } = await supabase.rpc("save_diagnosis", {
    _id: id,
    _occupation_id: result.occupationId,
    _track: result.track,
    _type_id: result.type.id,
    _type_name: result.type.name,
    _exposure: result.axes.exposure,
    _usage: result.axes.usage,
    _total: result.totalWeeklyHours,
    _savable: result.savableWeeklyHours,
    _tasks: packTasks(result),
    _summary: toPublicSummary(result) as unknown as Json,
  });
  if (error) {
    console.error("진단 저장 실패:", error.message);
    return null;
  }
  return id;
}

export interface PublicDiagnosis {
  id: string;
  typeId: number;
  typeName: string;
  track: string;
  summary: PublicSummary;
  createdAt: string;
}

export async function fetchPublicDiagnosis(id: string): Promise<PublicDiagnosis | null> {
  const { data, error } = await supabase.rpc("get_public_diagnosis", { _id: id });
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  return {
    id: row.id,
    typeId: row.type_id,
    typeName: row.type_name,
    track: row.track,
    summary: row.summary as unknown as PublicSummary,
    createdAt: row.created_at,
  };
}

export async function attachEmail(diagnosisId: string, email: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("attach_email_to_diagnosis", {
    _id: diagnosisId,
    _email: email,
  });
  return !error && Boolean(data);
}

/** S8a — 이메일 없이는 초대 링크가 만들어지지 않는다 (PRD 3.5) */
export async function createPairing(diagnosisId: string, email: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("create_pairing", {
    _diagnosis_id: diagnosisId,
    _email: email,
  });
  if (error || !data) {
    console.error("궁합 초대 생성 실패:", error?.message);
    return null;
  }
  return data;
}

/** S8b — 초대받은 쪽도 이메일을 넣어야 결과가 성립한다 (궁합 1건당 이메일 2건) */
export async function acceptPairing(
  pairingId: string,
  diagnosisId: string,
  email: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("accept_pairing", {
    _pairing_id: pairingId,
    _diagnosis_id: diagnosisId,
    _email: email,
  });
  return !error && Boolean(data);
}

export interface PairingRow {
  id: string;
  status: "waiting" | "complete";
  inviter: PublicSummary;
  invitee: PublicSummary | null;
  createdAt: string;
}

export async function fetchPairing(id: string): Promise<PairingRow | null> {
  const { data, error } = await supabase.rpc("get_pairing", { _id: id });
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  return {
    id: row.id,
    status: row.status === "complete" ? "complete" : "waiting",
    inviter: row.inviter_summary as unknown as PublicSummary,
    invitee: (row.invitee_summary as unknown as PublicSummary) ?? null,
    createdAt: row.created_at,
  };
}

/** 화면정의 S1 — 직종을 못 찾은 비율을 계측한다 */
export async function reportOccupationMiss(term: string): Promise<void> {
  try {
    await supabase.rpc("bump_occupation_miss", { _term: term });
  } catch {
    // 계측 실패가 진단을 막지 않는다
  }
}
