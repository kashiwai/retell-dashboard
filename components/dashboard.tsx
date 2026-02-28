import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, TrendingUp, Users, Settings, Bell, ChevronRight, Play, Pause, Search, Filter, MoreHorizontal, CheckCircle, AlertCircle, Smile, Frown, Meh, Volume2, MessageSquare, Bot, Hash, BarChart3, Zap, Moon, Sun, Menu, X, ExternalLink, Plus, Mic, RefreshCw } from "lucide-react";

// ─── Components ───
const SentimentIcon = ({ sentiment, size = 16 }: { sentiment: string; size?: number }) => {
  if (sentiment === "positive") return <Smile size={size} className="text-emerald-500" />;
  if (sentiment === "negative") return <Frown size={size} className="text-red-500" />;
  return <Meh size={size} className="text-gray-400" />;
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    transferred: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    failed: "bg-red-500/10 text-red-600 border-red-500/20",
    active: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  };
  const labels: Record<string, string> = { completed: "完了", transferred: "転送", failed: "失敗", active: "通話中" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.completed}`}>
      {labels[status] || status}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, trend, color = "blue" }: { icon: any; label: string; value: string; sub?: string; trend?: string; color?: string }) => {
  const colors: Record<string, string> = {
    blue: "from-blue-500/10 to-blue-600/5 border-blue-500/15",
    emerald: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/15",
    amber: "from-amber-500/10 to-amber-600/5 border-amber-500/15",
    violet: "from-violet-500/10 to-violet-600/5 border-violet-500/15",
  };
  const iconColors: Record<string, string> = {
    blue: "text-blue-500", emerald: "text-emerald-500",
    amber: "text-amber-500", violet: "text-violet-500",
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colors[color]} border p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1 tracking-tight">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm ${iconColors[color]}`}>
          <Icon size={22} />
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-3">
          <TrendingUp size={14} className="text-emerald-500" />
          <span className="text-xs font-medium text-emerald-600">{trend}</span>
          <span className="text-xs text-gray-400">前週比</span>
        </div>
      )}
    </div>
  );
};

// ─── Sidebar Navigation ───
const navItems = [
  { icon: BarChart3, label: "ダッシュボード", id: "dashboard" },
  { icon: Phone, label: "通話履歴", id: "calls" },
  { icon: Bot, label: "エージェント", id: "agents" },
  { icon: Hash, label: "電話番号", id: "numbers" },
  { icon: Bell, label: "通知設定", id: "notifications" },
  { icon: Settings, label: "設定", id: "settings" },
];

// ─── Main App ───
export default function CallFlowDashboard() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [playingAudio, setPlayingAudio] = useState<any>(null);
  
  // API Data States
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all data in parallel
      const [statsRes, callsRes, analyticsRes, agentsRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/calls?limit=10'),
        fetch('/api/analytics'),
        fetch('/api/agents')
      ]);
      
      if (!statsRes.ok || !callsRes.ok || !analyticsRes.ok || !agentsRes.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const [stats, calls, analytics, agentsData] = await Promise.all([
        statsRes.json(),
        callsRes.json(),
        analyticsRes.json(),
        agentsRes.json()
      ]);
      
      setDashboardStats(stats);
      setRecentCalls(calls);
      setAnalyticsData(analytics);
      setAgents(agentsData);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Initial fetch and refresh every 30 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Get data with defaults
  const callsData = analyticsData?.callsData || [];
  const sentimentData = analyticsData?.sentimentData || [];
  const hourlyData = analyticsData?.hourlyData || [];

  // ─── Dashboard View ───
  const DashboardView = () => {
    // Calculate stats from API data
    const todaysCalls = dashboardStats?.todaysCalls || 0;
    const avgDuration = dashboardStats?.avgDuration || "0:00";
    const aiResolutionRate = dashboardStats?.aiResolutionRate || 0;
    const sentiment = dashboardStats?.sentimentAnalysis || { positive: 0, neutral: 0, negative: 0 };
    const customerSatisfaction = sentiment.positive || 0;
    
    return (
    <div className="space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <button 
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          {loading ? "更新中..." : "更新"}
        </button>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          エラー: {error}
        </div>
      )}
      
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={PhoneIncoming} 
          label="今日の着信" 
          value={todaysCalls.toString()} 
          sub="本日の通話数" 
          color="blue" 
        />
        <StatCard 
          icon={Clock} 
          label="平均通話時間" 
          value={avgDuration} 
          sub="全通話平均" 
          color="emerald" 
        />
        <StatCard 
          icon={Smile} 
          label="顧客満足度" 
          value={`${customerSatisfaction}%`} 
          sub="ポジティブ率" 
          color="amber" 
        />
        <StatCard 
          icon={Zap} 
          label="AI解決率" 
          value={`${aiResolutionRate}%`} 
          sub="転送なし完了" 
          color="violet" 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Call Volume Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900">通話推移</h3>
              <p className="text-xs text-gray-400 mt-0.5">過去7日間</p>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />件数</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-400" />分数</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={callsData}>
              <defs>
                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
              <Area type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorCalls)" name="通話件数" />
              <Area type="monotone" dataKey="minutes" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorMinutes)" name="通話分数" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sentiment Pie */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-1">感情分析</h3>
          <p className="text-xs text-gray-400 mb-3">今月の傾向</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value" strokeWidth={0}>
                {sentimentData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {sentimentData.map((s: any) => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-sm text-gray-600">{s.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hourly Distribution */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-1">時間帯別着信分布</h3>
        <p className="text-xs text-gray-400 mb-4">営業時間のピーク把握に</p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={30} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Bar dataKey="calls" name="着信数" radius={[4, 4, 0, 0]}>
              {hourlyData.map((entry: any, i: number) => (
                <Cell key={i} fill={(entry as any).calls > 5 ? "#3b82f6" : (entry as any).calls > 2 ? "#93c5fd" : "#e0e7ff"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Calls */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-3">
          <div>
            <h3 className="font-bold text-gray-900">最近の通話</h3>
            <p className="text-xs text-gray-400 mt-0.5">リアルタイム更新</p>
          </div>
          <button onClick={() => setActiveNav("calls")} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            すべて表示 <ChevronRight size={14} />
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="animate-spin text-gray-400" size={24} />
            </div>
          ) : recentCalls.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              通話履歴がありません
            </div>
          ) : (
            recentCalls.slice(0, 5).map((call) => (
            <button key={call.id} onClick={() => setSelectedCall(call)} className="w-full text-left px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <SentimentIcon sentiment={call.sentiment} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900">{call.name}</span>
                    <span className="text-xs text-gray-400">{call.from}</span>
                    <StatusBadge status={call.status} />
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{call.summary}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span>{call.time}</span>
                    <span>•</span>
                    <span>{call.duration}</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">{call.purpose}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 mt-1 flex-shrink-0" />
              </div>
            </button>
          ))
          )}
        </div>
      </div>
    </div>
  );
  };

  // ─── Call Detail Modal ───
  const CallDetailModal = ({ call, onClose }: { call: any; onClose: () => void }) => {
    if (!call) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
        <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <SentimentIcon sentiment={call.sentiment} size={20} />
                  <h2 className="text-xl font-bold text-gray-900">{call.name}</h2>
                </div>
                <p className="text-sm text-gray-400 mt-1">{call.from} • {call.time} • {call.duration}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Status */}
            <div className="flex gap-2 mb-5">
              <StatusBadge status={call.status} />
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">{call.purpose}</span>
            </div>

            {/* Recording Player */}
            <div className="bg-gradient-to-r from-blue-50 to-violet-50 rounded-2xl p-4 mb-5 border border-blue-100/50">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPlayingAudio(playingAudio === call.id ? null : call.id)}
                  className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-colors"
                >
                  {playingAudio === call.id ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                </button>
                <div className="flex-1">
                  <div className="h-1.5 bg-blue-200/50 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: playingAudio === call.id ? "45%" : "0%" }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-blue-600/60">{playingAudio === call.id ? "1:32" : "0:00"}</span>
                    <span className="text-xs text-blue-600/60">{call.duration}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="mb-5">
              <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                <MessageSquare size={14} className="text-blue-500" /> AI要約
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                {call.summary}
              </p>
            </div>

            {/* Transcript Preview */}
            <div className="mb-5">
              <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                <Volume2 size={14} className="text-violet-500" /> 文字起こし
              </h3>
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-2.5 text-sm">
                <div>
                  <span className="text-blue-600 font-semibold text-xs">AI受付</span>
                  <p className="text-gray-600 mt-0.5">お電話ありがとうございます。コールフロー株式会社でございます。</p>
                </div>
                <div>
                  <span className="text-emerald-600 font-semibold text-xs">お客様</span>
                  <p className="text-gray-600 mt-0.5">あ、すみません、{call.purpose}について聞きたいんですが...</p>
                </div>
                <div>
                  <span className="text-blue-600 font-semibold text-xs">AI受付</span>
                  <p className="text-gray-600 mt-0.5">かしこまりました。{call.purpose}についてですね。お調べいたしますので少々お待ちください。</p>
                </div>
                <p className="text-gray-400 text-xs text-center pt-1">...続きは全文表示で確認</p>
              </div>
            </div>

            {/* Action Items */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-500" /> 対応事項
              </h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded-md border-gray-300 text-blue-600" />
                  <span className="text-sm text-gray-700">{call.name}に折り返し連絡</span>
                </label>
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded-md border-gray-300 text-blue-600" />
                  <span className="text-sm text-gray-700">詳細資料をメールで送付</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Agents View ───
  const AgentsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">エージェント管理</h2>
          <p className="text-sm text-gray-400 mt-1">AIエージェントの作成・編集・テスト</p>
        </div>
        <button className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Plus size={16} /> 新規エージェント
        </button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="animate-spin text-gray-400" size={32} />
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="mx-auto mb-4 text-gray-300" size={48} />
            <p className="text-gray-500">エージェントが設定されていません</p>
          </div>
        ) : (
          agents.map(agent => (
          <div key={agent.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <Bot size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">{agent.name}</h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-emerald-600 font-medium">稼働中</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Mic size={12} /> {agent.voice}</span>
                    <span>•</span>
                    <span>{agent.lang}</span>
                    <span>•</span>
                    <span>本日 {agent.calls_today}件対応</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors font-medium">テスト</button>
                <button className="px-3 py-1.5 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors font-medium">編集</button>
              </div>
            </div>

            {/* Agent Settings Preview */}
            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">プロンプト（抜粋）</h4>
              <p className="text-sm text-gray-600 line-clamp-2">
                あなたは日本語の電話受付AIアシスタントです。丁寧で自然な日本語で電話対応をしてください。お客様のお名前と用件をお伺いし...
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              {[
                { label: "応答速度", value: "0.8s" },
                { label: "解決率", value: "82%" },
                { label: "平均時間", value: "2:45" },
                { label: "満足度", value: "94%" },
              ].map(stat => (
                <div key={stat.label} className="text-center p-2 rounded-xl bg-white border border-gray-100">
                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        ))
        )}
      </div>
    </div>
  );

  // ─── Calls View ───
  const CallsView = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [dateRange, setDateRange] = useState("today");
    
    // Filter calls based on search and filters
    const filteredCalls = recentCalls.filter(call => {
      const matchesSearch = searchTerm === "" || 
        call.from?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.purpose?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || call.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
    
    return (
      <div className="space-y-6">
        {/* Header with filters */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">通話履歴</h2>
            <p className="text-sm text-gray-400 mt-1">全ての通話記録と詳細情報</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Status filter */}
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべて</option>
              <option value="completed">完了</option>
              <option value="transferred">転送</option>
              <option value="failed">失敗</option>
            </select>
            
            {/* Date range */}
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">今日</option>
              <option value="week">今週</option>
              <option value="month">今月</option>
              <option value="all">全期間</option>
            </select>
            
            {/* Export button */}
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              CSVダウンロード
            </button>
          </div>
        </div>
        
        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">本日の通話</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{recentCalls.length}</p>
              </div>
              <PhoneIncoming className="text-blue-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">完了率</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {Math.round((recentCalls.filter(c => c.status === "completed").length / recentCalls.length) * 100)}%
                </p>
              </div>
              <CheckCircle className="text-emerald-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">平均時間</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{dashboardStats?.avgDuration || "0:00"}</p>
              </div>
              <Clock className="text-amber-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">満足度</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {dashboardStats?.sentimentAnalysis?.positive || 0}%
                </p>
              </div>
              <Smile className="text-violet-500" size={24} />
            </div>
          </div>
        </div>
        
        {/* Calls table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">時刻</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">発信者</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">用件</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">時間</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">感情</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">状態</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <RefreshCw className="animate-spin mx-auto text-gray-400" size={24} />
                      <p className="text-gray-500 mt-2">読み込み中...</p>
                    </td>
                  </tr>
                ) : filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      通話履歴がありません
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map((call) => (
                    <tr key={call.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{call.time}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{call.from}</p>
                          {call.name && <p className="text-xs text-gray-500">{call.name}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{call.purpose}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{call.summary}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{call.duration}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <SentimentIcon sentiment={call.sentiment} size={20} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={call.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setSelectedCall(call)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            詳細
                          </button>
                          {call.recording_url && (
                            <button 
                              onClick={() => setPlayingAudio(playingAudio === call.id ? null : call.id)}
                              className="text-gray-600 hover:text-gray-700"
                            >
                              {playingAudio === call.id ? <Pause size={16} /> : <Play size={16} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };
  
  // ─── Notifications View ───
  const NotificationsView = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">通知設定</h2>
        <p className="text-sm text-gray-400 mt-1">通話イベントの通知先を管理</p>
      </div>

      <div className="grid gap-4">
        {[
          { type: "Slack", icon: "💬", connected: true, channel: "#customer-calls", events: ["通話終了", "転送", "クレーム検出"] },
          { type: "LINE", icon: "💚", connected: true, target: "営業チームグループ", events: ["通話終了", "折り返し依頼"] },
          { type: "メール", icon: "✉️", connected: false, target: "", events: [] },
          { type: "Webhook", icon: "🔗", connected: false, target: "", events: [] },
        ].map(ch => (
          <div key={ch.type} className={`bg-white rounded-2xl border p-5 shadow-sm ${ch.connected ? "border-gray-100" : "border-dashed border-gray-200"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{ch.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">{ch.type}</h3>
                    {ch.connected ? (
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">接続済み</span>
                    ) : (
                      <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">未接続</span>
                    )}
                  </div>
                  {ch.connected && (
                    <p className="text-sm text-gray-400 mt-0.5">{ch.channel || ch.target}</p>
                  )}
                </div>
              </div>
              <button className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                ch.connected
                  ? "text-gray-600 bg-gray-50 hover:bg-gray-100"
                  : "text-blue-600 bg-blue-50 hover:bg-blue-100"
              }`}>
                {ch.connected ? "設定変更" : "接続する"}
              </button>
            </div>
            {ch.connected && ch.events.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {ch.events.map(e => (
                  <span key={e} className="px-2 py-1 text-xs rounded-lg bg-gray-50 text-gray-600 border border-gray-100">{e}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // ─── Render Active View ───
  const renderView = () => {
    switch (activeNav) {
      case "dashboard": return <DashboardView />;
      case "agents": return <AgentsView />;
      case "notifications": return <NotificationsView />;
      case "calls": return <CallsView />;
      default: return (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <Settings size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">このページは開発中です</p>
            <p className="text-sm mt-1">Phase 2 で実装予定</p>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex" style={{ fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 flex flex-col transform transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-50">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Phone size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-gray-900">CallFlow</h1>
            <p className="text-[10px] text-gray-400 -mt-0.5 font-medium">AI電話受付サービス</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveNav(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeNav === item.id
                  ? "bg-blue-50 text-blue-700 shadow-sm shadow-blue-500/5"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Usage */}
        <div className="p-4 mx-3 mb-3 rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 border border-blue-100/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">今月の利用量</span>
            <span className="font-bold text-blue-700">428 / 500分</span>
          </div>
          <div className="mt-2 h-1.5 bg-blue-200/40 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full" style={{ width: "85.6%" }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">スタータープラン • 残り72分</p>
        </div>

        {/* Org */}
        <div className="border-t border-gray-50 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">CF</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">コールフロー株式会社</p>
              <p className="text-xs text-gray-400">スタータープラン</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-xl">
              <Menu size={20} className="text-gray-500" />
            </button>
            <h2 className="text-lg font-bold text-gray-900">
              {navItems.find(n => n.id === activeNav)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Live indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-700">AI稼働中</span>
            </div>
            <button className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
              <Bell size={18} className="text-gray-400" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 lg:p-6 max-w-6xl">
          {renderView()}
        </div>
      </main>

      {/* Call Detail Modal */}
      <CallDetailModal call={selectedCall} onClose={() => setSelectedCall(null)} />
    </div>
  );
}
