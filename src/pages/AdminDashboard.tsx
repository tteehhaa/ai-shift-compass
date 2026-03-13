import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Users, BarChart3, Share2, Trophy, TrendingUp, Trash2 } from "lucide-react";
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [sharedResults, setSharedResults] = useState<SharedResult[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "rankings" | "subscribers" | "shares">("overview");

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

    // Load all data in parallel
    const [rankingsRes, subscribersRes, sharesRes] = await Promise.all([
      supabase.from("activity_rankings").select("*").order("count", { ascending: false }),
      supabase.from("email_subscribers").select("*").order("created_at", { ascending: false }),
      supabase.from("shared_results").select("id, mbti, created_at").order("created_at", { ascending: false }),
    ]);

    if (rankingsRes.data) setRankings(rankingsRes.data);
    if (subscribersRes.data) setSubscribers(subscribersRes.data);
    if (sharesRes.data) setSharedResults(sharesRes.data);
    setLoading(false);
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
  ];

  // Stats
  const totalSubscribers = subscribers.length;
  const totalShares = sharedResults.length;
  const totalRankingEntries = rankings.reduce((s, r) => s + r.count, 0);
  const avgShiftIndex = subscribers.length
    ? Math.round(subscribers.filter(s => s.shift_index).reduce((s, sub) => s + (sub.shift_index || 0), 0) / subscribers.filter(s => s.shift_index).length)
    : 0;

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
            {/* Stats Grid */}
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

            {/* Top MBTIs */}
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

            {/* Top 5 Rankings Preview */}
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
                  <span className="text-[11px] text-muted-foreground font-mono">{share.id.slice(0, 8)}...</span>
                </div>
              ))}
              {sharedResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">아직 공유된 결과가 없습니다.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
