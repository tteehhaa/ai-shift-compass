import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Users, BarChart3, Share2, Trophy, TrendingUp, Trash2, Star, Settings2 } from "lucide-react";
import { toast } from "sonner";
import CountUp from "@/components/CountUp";

interface RankingItem {
  activity_name: string;
  replacement_score: number;
  replacement_level: string;
  category: string;
  count: number;
}

interface Subscriber {
  id: string;
  email: string;
  mbti: string | null;
  shift_index: number | null;
  created_at: string;
}

interface SharedResult {
  id: string;
  mbti: string;
  created_at: string;
}

interface FeedbackItem {
  id: string;
  diagnosis_id: string | null;
  accuracy_score: number;
  comment: string | null;
  created_at: string;
}

interface DiagnosisItem {
  id: string;
  email: string | null;
  mbti: string;
  shift_index: number;
  created_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [sharedResults, setSharedResults] = useState<SharedResult[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [diagnoses, setDiagnoses] = useState<DiagnosisItem[]>([]);
  const [algorithmConfigs, setAlgorithmConfigs] = useState<{ config_key: string; config_value: number; updated_at: string; updated_by: string }[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "rankings" | "subscribers" | "shares" | "feedback" | "optimization">("overview");

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/admin");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      await supabase.auth.signOut();
      navigate("/admin");
      return;
    }

    const [rankingsRes, subscribersRes, sharesRes, feedbackRes, diagnosisRes, configRes] = await Promise.all([
      supabase.from("activity_rankings").select("*").order("count", { ascending: false }),
      supabase.from("email_subscribers").select("*").order("created_at", { ascending: false }),
      supabase.from("shared_results").select("id, mbti, created_at").order("created_at", { ascending: false }),
      supabase.from("accuracy_feedback" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("diagnosis_results" as any).select("id, email, mbti, shift_index, created_at").order("created_at", { ascending: false }),
      supabase.from("algorithm_config" as any).select("config_key, config_value, updated_at, updated_by").order("config_key"),
    ]);

    if (rankingsRes.data) setRankings(rankingsRes.data);
    if (subscribersRes.data) setSubscribers(subscribersRes.data);
    if (sharesRes.data) setSharedResults(sharesRes.data);
    if (feedbackRes.data) setFeedbacks(feedbackRes.data as any[]);
    if (diagnosisRes.data) setDiagnoses(diagnosisRes.data as any[]);
    if (configRes.data) setAlgorithmConfigs(configRes.data as any[]);
    setLoading(false);
  };

  const handleRunOptimizer = async () => {
    setIsOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-weights", {
        body: { trigger: "manual" },
      });
      if (error) throw error;
      toast.success(`최적화 완료: ${data.adjustmentsApplied || 0}건 조정`);
      // Refresh config
      const { data: newConfig } = await supabase.from("algorithm_config" as any).select("config_key, config_value, updated_at, updated_by").order("config_key");
      if (newConfig) setAlgorithmConfigs(newConfig as any[]);
    } catch (e) {
      toast.error("최적화 실행 실패");
      console.error(e);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin");
  };

  const handleDeleteRanking = async (activityName: string) => {
    if (!confirm(`"${activityName}" 항목을 삭제하시겠습니까?`)) return;
    const { error } = await supabase.from("activity_rankings").delete().eq("activity_name", activityName);
    if (error) { toast.error("삭제 실패"); return; }
    setRankings((prev) => prev.filter((r) => r.activity_name !== activityName));
    toast.success("삭제되었습니다");
  };

  const handleDeleteSubscriber = async (id: string) => {
    if (!confirm("이 구독자를 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("email_subscribers").delete().eq("id", id);
    if (error) { toast.error("삭제 실패"); return; }
    setSubscribers((prev) => prev.filter((s) => s.id !== id));
    toast.success("삭제되었습니다");
  };

  const handleDeleteShare = async (id: string) => {
    if (!confirm("이 공유 결과를 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("shared_results").delete().eq("id", id);
    if (error) { toast.error("삭제 실패"); return; }
    setSharedResults((prev) => prev.filter((s) => s.id !== id));
    toast.success("삭제되었습니다");
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!confirm("이 피드백을 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("accuracy_feedback" as any).delete().eq("id", id);
    if (error) { toast.error("삭제 실패"); return; }
    setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    toast.success("삭제되었습니다");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  const tabs = [
    { key: "overview" as const, label: "개요", icon: BarChart3 },
    { key: "rankings" as const, label: "업무 랭킹", icon: Trophy },
    { key: "subscribers" as const, label: "구독자", icon: Users },
    { key: "shares" as const, label: "공유 결과", icon: Share2 },
    { key: "feedback" as const, label: "피드백", icon: Star },
    { key: "optimization" as const, label: "가중치 최적화", icon: Settings2 },
  ];

  // Stats
  const totalSubscribers = subscribers.length;
  const totalShares = sharedResults.length;
  const totalRankingEntries = rankings.reduce((s, r) => s + r.count, 0);
  const avgShiftIndex = subscribers.length
    ? Math.round(subscribers.filter(s => s.shift_index).reduce((s, sub) => s + (sub.shift_index || 0), 0) / subscribers.filter(s => s.shift_index).length)
    : 0;

  // Feedback stats
  const avgFeedbackScore = feedbacks.length
    ? (feedbacks.reduce((s, f) => s + f.accuracy_score, 0) / feedbacks.length).toFixed(1)
    : "N/A";
  const feedbackDistribution = [1, 2, 3, 4, 5].map(score => ({
    score,
    count: feedbacks.filter(f => f.accuracy_score === score).length,
  }));

  // MBTI distribution
  const mbtiCounts: Record<string, number> = {};
  [...subscribers, ...sharedResults].forEach((item) => {
    if (item.mbti && item.mbti !== "UNKNOWN") {
      mbtiCounts[item.mbti] = (mbtiCounts[item.mbti] || 0) + 1;
    }
  });
  const topMBTIs = Object.entries(mbtiCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Weight optimization analysis
  const computeOptimizationInsights = () => {
    if (feedbacks.length < 5) return null;

    // Group feedback by score ranges
    const lowScoreFeedbacks = feedbacks.filter(f => f.accuracy_score <= 2);
    const highScoreFeedbacks = feedbacks.filter(f => f.accuracy_score >= 4);
    const totalFeedbacks = feedbacks.length;

    // Satisfaction rate
    const satisfactionRate = Math.round((highScoreFeedbacks.length / totalFeedbacks) * 100);

    // Trend: compare recent vs older
    const sorted = [...feedbacks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const recentHalf = sorted.slice(0, Math.ceil(sorted.length / 2));
    const olderHalf = sorted.slice(Math.ceil(sorted.length / 2));
    const recentAvg = recentHalf.reduce((s, f) => s + f.accuracy_score, 0) / recentHalf.length;
    const olderAvg = olderHalf.length ? olderHalf.reduce((s, f) => s + f.accuracy_score, 0) / olderHalf.length : recentAvg;
    const trend = recentAvg - olderAvg;

    // Current weights for reference
    const currentWeights = {
      '📧 단순 행정': 85,
      '📚 자기계발': 70,
      '💻 전문 업무': 55,
      '📱 소셜 미디어': 92,
      '🎬 미디어 감상': 88,
      '🏃 운동/활동': 5,
      '🤝 대면 소통': 5,
      '🛌 휴식/수면': 5,
      '🚗 운전': 5,
      '🥗 식사/요리': 10,
      '🧹 집안일/쇼핑': 10,
      '➕ 기타': 10,
    };

    // Suggestions based on satisfaction
    const suggestions: string[] = [];
    if (satisfactionRate < 50) {
      suggestions.push("만족도가 낮습니다. 전반적인 대체 점수(replacement_score) 가중치를 5~10% 하향 조정하는 것을 권장합니다.");
      suggestions.push("특히 '전문 업무' 카테고리의 점수를 55% → 45%로 낮추면 체감 정확도가 올라갈 수 있습니다.");
    } else if (satisfactionRate < 70) {
      suggestions.push("보통 수준의 만족도입니다. '디지털 소비' 카테고리의 도파민 잠식 가중치(1.2배)를 1.1배로 완화하면 더 현실적인 결과를 제공할 수 있습니다.");
    } else {
      suggestions.push("높은 만족도를 유지하고 있습니다. 현재 가중치를 유지하세요.");
    }

    if (lowScoreFeedbacks.length > 0) {
      const recentComments = lowScoreFeedbacks
        .filter(f => f.comment)
        .slice(0, 3)
        .map(f => f.comment);
      if (recentComments.length > 0) {
        suggestions.push(`낮은 점수 피드백의 주요 의견: "${recentComments.join('", "')}"`);
      }
    }

    if (trend > 0.3) {
      suggestions.push("📈 최근 피드백 점수가 상승 추세입니다. 현재 방향이 올바릅니다.");
    } else if (trend < -0.3) {
      suggestions.push("📉 최근 피드백 점수가 하락 추세입니다. 가중치 재검토가 필요합니다.");
    }

    return {
      satisfactionRate,
      recentAvg: recentAvg.toFixed(1),
      olderAvg: olderAvg.toFixed(1),
      trend: trend > 0 ? `+${trend.toFixed(2)}` : trend.toFixed(2),
      currentWeights,
      suggestions,
      lowCount: lowScoreFeedbacks.length,
      highCount: highScoreFeedbacks.length,
    };
  };

  const optimizationData = computeOptimizationInsights();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground">Admin Dashboard</h1>
            <p className="text-[11px] text-muted-foreground">AI Life Shift 관리자</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 space-y-8">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === key
                  ? "bg-foreground text-background"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "이메일 구독자", value: totalSubscribers, icon: Users, color: "text-blue-500" },
                { label: "공유 횟수", value: totalShares, icon: Share2, color: "text-green-500" },
                { label: "활동 입력 수", value: totalRankingEntries, icon: TrendingUp, color: "text-amber-500" },
                { label: "평균 시프트 지수", value: avgShiftIndex, suffix: "%", icon: BarChart3, color: "text-purple-500" },
              ].map(({ label, value, suffix, icon: Icon, color }) => (
                <div key={label} className="glass-card rounded-2xl p-5 text-center">
                  <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
                  <p className="text-2xl font-bold text-foreground">
                    <CountUp end={value} suffix={suffix || ""} />
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Feedback summary in overview */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card rounded-2xl p-5 text-center">
                <Star className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                <p className="text-2xl font-bold text-foreground">{avgFeedbackScore}</p>
                <p className="text-[11px] text-muted-foreground mt-1">평균 정확도 점수</p>
              </div>
              <div className="glass-card rounded-2xl p-5 text-center">
                <Star className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                <p className="text-2xl font-bold text-foreground">{feedbacks.length}</p>
                <p className="text-[11px] text-muted-foreground mt-1">총 피드백 수</p>
              </div>
            </div>

            {topMBTIs.length > 0 && (
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">MBTI 분포 TOP 5</h3>
                <div className="space-y-3">
                  {topMBTIs.map(([mbti, count]) => {
                    const maxCount = topMBTIs[0][1] as number;
                    return (
                      <div key={mbti} className="flex items-center gap-3">
                        <span className="text-sm font-bold text-foreground w-12">{mbti}</span>
                        <div className="flex-1 h-6 bg-secondary/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-foreground/20 rounded-full transition-all"
                            style={{ width: `${(count / maxCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">AI 대체 업무 TOP 5</h3>
              <div className="space-y-2">
                {rankings.slice(0, 5).map((item, i) => (
                  <div key={item.activity_name} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                    <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.activity_name}</p>
                      <p className="text-[11px] text-muted-foreground">{item.category}</p>
                    </div>
                    <span className="text-sm font-bold text-foreground">{item.count}회</span>
                    <span className="text-xs font-medium text-muted-foreground">{item.replacement_score}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Rankings Tab */}
        {activeTab === "rankings" && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-border/30">
              <h3 className="text-sm font-semibold text-foreground">전체 AI 대체 업무 랭킹 ({rankings.length}개)</h3>
            </div>
            <div className="divide-y divide-border/30">
              {rankings.map((item, i) => (
                <div key={item.activity_name} className="flex items-center gap-4 px-5 py-3">
                  <span className="text-sm font-bold text-muted-foreground w-8">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.activity_name}</p>
                    <p className="text-[11px] text-muted-foreground">{item.category} · {item.replacement_level}</p>
                  </div>
                  <span className="text-sm font-bold text-foreground">{item.count}회</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{item.replacement_score}%</span>
                  <button onClick={() => handleDeleteRanking(item.activity_name)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              {rankings.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">아직 데이터가 없습니다.</p>
              )}
            </div>
          </div>
        )}

        {/* Subscribers Tab */}
        {activeTab === "subscribers" && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-border/30">
              <h3 className="text-sm font-semibold text-foreground">이메일 구독자 ({subscribers.length}명)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-muted-foreground">
                     <th className="text-left px-5 py-3 font-medium">이메일</th>
                     <th className="text-left px-5 py-3 font-medium">MBTI</th>
                     <th className="text-left px-5 py-3 font-medium">시프트 지수</th>
                     <th className="text-left px-5 py-3 font-medium">가입일</th>
                     <th className="text-right px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {subscribers.map((sub) => (
                    <tr key={sub.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-5 py-3 text-foreground">{sub.email}</td>
                      <td className="px-5 py-3">{sub.mbti || "-"}</td>
                      <td className="px-5 py-3">{sub.shift_index ? `${sub.shift_index}%` : "-"}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {new Date(sub.created_at).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => handleDeleteSubscriber(sub.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {subscribers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">아직 구독자가 없습니다.</p>
              )}
            </div>
          </div>
        )}

        {/* Shares Tab */}
        {activeTab === "shares" && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-border/30">
              <h3 className="text-sm font-semibold text-foreground">공유된 결과 ({sharedResults.length}건)</h3>
            </div>
            <div className="divide-y divide-border/30">
              {sharedResults.map((share) => (
                <div key={share.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm text-foreground font-medium">{share.mbti || "UNKNOWN"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(share.created_at).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground font-mono">{share.id.slice(0, 8)}...</span>
                    <button onClick={() => handleDeleteShare(share.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
              {sharedResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">아직 공유된 결과가 없습니다.</p>
              )}
            </div>
          </div>
        )}

        {/* Feedback Tab */}
        {activeTab === "feedback" && (
          <div className="space-y-6">
            {/* Feedback Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="glass-card rounded-2xl p-5 text-center">
                <p className="text-2xl font-bold text-foreground">{avgFeedbackScore}</p>
                <p className="text-[11px] text-muted-foreground mt-1">평균 점수</p>
              </div>
              <div className="glass-card rounded-2xl p-5 text-center">
                <p className="text-2xl font-bold text-foreground">{feedbacks.length}</p>
                <p className="text-[11px] text-muted-foreground mt-1">총 피드백</p>
              </div>
              <div className="glass-card rounded-2xl p-5 text-center">
                <p className="text-2xl font-bold text-foreground">{diagnoses.length}</p>
                <p className="text-[11px] text-muted-foreground mt-1">총 진단 수</p>
              </div>
            </div>

            {/* Score Distribution */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">점수 분포</h3>
              <div className="space-y-2">
                {feedbackDistribution.map(({ score, count }) => {
                  const maxCount = Math.max(...feedbackDistribution.map(d => d.count), 1);
                  return (
                    <div key={score} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-16">
                        {Array.from({ length: score }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <div className="flex-1 h-5 bg-secondary/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400/50 rounded-full transition-all"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Feedbacks */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-border/30">
                <h3 className="text-sm font-semibold text-foreground">최근 피드백 ({feedbacks.length}건)</h3>
              </div>
              <div className="divide-y divide-border/30">
                {feedbacks.slice(0, 50).map((fb) => (
                  <div key={fb.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex items-center gap-0.5 shrink-0">
                      {Array.from({ length: fb.accuracy_score }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      {fb.comment ? (
                        <p className="text-sm text-foreground truncate">{fb.comment}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">코멘트 없음</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(fb.created_at).toLocaleString("ko-KR")}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteFeedback(fb.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                {feedbacks.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">아직 피드백이 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Optimization Tab */}
        {activeTab === "optimization" && (
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-semibold text-foreground">가중치 최적화 분석</h3>
                </div>
                <button
                  onClick={handleRunOptimizer}
                  disabled={isOptimizing}
                  className="px-4 py-2 rounded-xl bg-foreground text-background text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {isOptimizing ? "최적화 중..." : "🔄 수동 실행"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                매일 03:00 KST에 자동 실행됩니다. 사용자 피드백 기반으로 가중치를 0.01 단위로 자동 조정합니다.
              </p>

              {/* Live Config from DB */}
              {algorithmConfigs.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-foreground mb-3">📊 현재 DB 가중치 (실시간)</h4>
                  <div className="space-y-1.5">
                    {algorithmConfigs.map((cfg) => {
                      const isReplacementScore = cfg.config_key.startsWith("replacement_score.");
                      const maxVal = isReplacementScore ? 100 : cfg.config_key === "hourly_value" ? 15000 : 10;
                      const barWidth = Math.min(100, (cfg.config_value / maxVal) * 100);
                      return (
                        <div key={cfg.config_key} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/30">
                          <span className="text-xs w-48 truncate font-mono">{cfg.config_key}</span>
                          <div className="flex-1 h-3 bg-secondary/50 rounded-full overflow-hidden">
                            <div className="h-full bg-foreground/20 rounded-full" style={{ width: `${barWidth}%` }} />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground w-16 text-right">{cfg.config_value}</span>
                          {cfg.updated_by === "auto-optimizer" && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">자동</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    마지막 업데이트: {algorithmConfigs[0]?.updated_at ? new Date(algorithmConfigs[0].updated_at).toLocaleString("ko-KR") : "-"}
                  </p>
                </div>
              )}

              {!optimizationData ? (
                <div className="p-6 rounded-2xl bg-secondary/50 text-center">
                  <p className="text-sm text-muted-foreground">최소 5건의 피드백이 필요합니다.</p>
                  <p className="text-xs text-muted-foreground mt-1">현재 {feedbacks.length}건</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl bg-secondary/50 text-center">
                      <p className="text-xl font-bold text-foreground">{optimizationData.satisfactionRate}%</p>
                      <p className="text-[10px] text-muted-foreground">만족도</p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50 text-center">
                      <p className="text-xl font-bold text-foreground">{optimizationData.recentAvg}</p>
                      <p className="text-[10px] text-muted-foreground">최근 평균</p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50 text-center">
                      <p className="text-xl font-bold text-foreground">{optimizationData.olderAvg}</p>
                      <p className="text-[10px] text-muted-foreground">이전 평균</p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50 text-center">
                      <p className={`text-xl font-bold ${optimizationData.trend.startsWith('+') ? 'text-green-600' : optimizationData.trend.startsWith('-') ? 'text-red-500' : 'text-foreground'}`}>
                        {optimizationData.trend}
                      </p>
                      <p className="text-[10px] text-muted-foreground">추이</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">💡 조정 제안</h4>
                    <div className="space-y-2">
                      {optimizationData.suggestions.map((s, i) => (
                        <div key={i} className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                          <p className="text-sm text-foreground leading-relaxed">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                    <p className="text-xs text-foreground leading-relaxed">
                      <strong>⚠️ 자가 진화 모드:</strong> 가중치는 <code className="px-1 py-0.5 bg-secondary rounded text-[11px]">algorithm_config</code> 테이블에서
                      실시간 로드되며, 매일 자동 최적화됩니다. 수동 실행 버튼으로 즉시 조정할 수도 있습니다.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
