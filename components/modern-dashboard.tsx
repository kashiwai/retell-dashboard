'use client';

import { useState, useEffect } from "react";
import { 
  Phone, Plus, Settings, Bell, BarChart3, Bot, Hash, X, Mic, Play, Pause, 
  MessageSquare, Volume2, CheckCircle, ChevronRight, Menu, RefreshCw,
  PhoneIncoming, PhoneOutgoing, Clock, TrendingUp, Users, Zap,
  Star, Globe, Shield, Activity, Headphones, Send, ExternalLink,
  Calendar, User, Mail, MapPin, Filter, Search, Download, MoreVertical, Cog, FileText,
  LogOut
} from "lucide-react";
import { useAuth } from '@/components/auth-provider';
import dynamic from 'next/dynamic';

const AgentConfigJapanese = dynamic(() => import('./agent-config-japanese'), {
  ssr: false
});

const CallDetailModal = dynamic(() => import('./call-detail-modal'), {
  ssr: false
});

const Logo = dynamic(() => import('./logo'), {
  ssr: false
});

export default function ModernDashboard() {
  const { user, logout } = useAuth();
  const [activeNav, setActiveNav] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // States
  const [agents, setAgents] = useState<any[]>([]);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [showEditAgent, setShowEditAgent] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [newAgent, setNewAgent] = useState({ name: "", voice_id: "", language: "ja" });
  const [editingAgent, setEditingAgent] = useState({ name: "", voice_id: "", language: "ja" });
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [updatingAgent, setUpdatingAgent] = useState(false);
  const [showNotificationConfig, setShowNotificationConfig] = useState<string | null>(null);
  const [slackWebhook, setSlackWebhook] = useState("");
  const [lineToken, setLineToken] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [calls, setCalls] = useState<any[]>([]);
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [showAgentConfig, setShowAgentConfig] = useState(false);
  const [configAgentId, setConfigAgentId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    todayCalls: 0,
    avgDuration: "0:00",
    aiResolution: 85,
    satisfaction: 92
  });
  const [showCallDetail, setShowCallDetail] = useState(false);
  const [selectedCallDetail, setSelectedCallDetail] = useState<any>(null);
  
  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [agentsRes, callsRes, numbersRes, statsRes] = await Promise.all([
        fetch("/api/agents"),
        fetch("/api/calls?limit=20"),
        fetch("/api/phone-numbers"),
        fetch("/api/dashboard")
      ]);
      
      if (agentsRes.ok) setAgents(await agentsRes.json());
      if (callsRes.ok) {
        const callData = await callsRes.json();
        console.log('Fetched calls data:', callData);
        setCalls(callData);
      }
      if (numbersRes.ok) setPhoneNumbers(await numbersRes.json());
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats({
          todayCalls: data.todaysCalls || 0,
          avgDuration: data.avgDuration || "0:00",
          aiResolution: data.aiResolutionRate || 85,
          satisfaction: data.sentimentAnalysis?.positive || 92
        });
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
    // 更新間隔を短くして、より頻繁にデータを取得
    const interval = setInterval(fetchData, 5000); // 5秒ごとに更新
    return () => clearInterval(interval);
  }, []);
  
  // Create agent
  const handleCreateAgent = async () => {
    if (!newAgent.name) return;
    setCreatingAgent(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: newAgent.name,
          voice_id: newAgent.voice_id || "11labs-Adrian",
          language: newAgent.language
        })
      });
      if (res.ok) {
        setShowCreateAgent(false);
        setNewAgent({ name: "", voice_id: "", language: "ja" });
        fetchData();
        alert("エージェントを作成しました");
      } else {
        const error = await res.json();
        alert(`エラー: ${error.error || "作成に失敗しました"}`);
      }
    } catch (error) {
      console.error("Failed to create agent:", error);
      alert("エージェントの作成に失敗しました");
    } finally {
      setCreatingAgent(false);
    }
  };
  
  // Update agent
  const handleUpdateAgent = async () => {
    if (!editingAgent.name || !selectedAgent) return;
    setUpdatingAgent(true);
    try {
      const res = await fetch("/api/agents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: selectedAgent.id,
          agent_name: editingAgent.name,
          voice_id: editingAgent.voice_id,
          language: editingAgent.language
        })
      });
      if (res.ok) {
        setShowEditAgent(false);
        setSelectedAgent(null);
        fetchData();
        alert("エージェントを更新しました");
      } else {
        const error = await res.json();
        alert(`エラー: ${error.error || "更新に失敗しました"}`);
      }
    } catch (error) {
      console.error("Failed to update agent:", error);
      alert("エージェントの更新に失敗しました");
    } finally {
      setUpdatingAgent(false);
    }
  };
  
  // Delete agent
  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm("このエージェントを削除しますか？")) return;
    try {
      const res = await fetch(`/api/agents?agent_id=${agentId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchData();
        alert("エージェントを削除しました");
      } else {
        const error = await res.json();
        alert(`エラー: ${error.error || "削除に失敗しました"}`);
      }
    } catch (error) {
      console.error("Failed to delete agent:", error);
      alert("エージェントの削除に失敗しました");
    }
  };
  
  // Open edit modal
  const openEditModal = (agent: any) => {
    setSelectedAgent(agent);
    setEditingAgent({
      name: agent.name,
      voice_id: agent.voice || "",
      language: agent.lang === "ja-JP" ? "ja" : agent.lang || "ja"
    });
    setShowEditAgent(true);
  };
  
  // Save notification config
  const handleSaveNotificationConfig = async (type: string) => {
    setSavingConfig(true);
    try {
      // Save configuration to localStorage
      if (type === "LINE") {
        localStorage.setItem('line_notify_token', lineToken);
        alert('LINE通知設定を保存しました\n\nテスト通知を送信するには、通話履歴から任意の通話を選択してください。');
      } else if (type === "Slack") {
        localStorage.setItem('slack_webhook', slackWebhook);
        alert('Slack通知設定を保存しました');
      }
      
      setShowNotificationConfig(null);
    } catch (error) {
      console.error("Failed to save config:", error);
      alert('設定の保存に失敗しました');
    } finally {
      setSavingConfig(false);
    }
  };
  
  // Navigation
  const navItems = [
    { id: "dashboard", label: "ダッシュボード", icon: BarChart3, color: "blue" },
    { id: "agents", label: "エージェント", icon: Bot, color: "purple" },
    { id: "calls", label: "通話履歴", icon: Phone, color: "green" },
    { id: "numbers", label: "電話番号", icon: Hash, color: "orange" },
    { id: "notifications", label: "通知設定", icon: Bell, color: "pink" },
    { id: "settings", label: "設定", icon: Settings, color: "gray" }
  ];
  
  // Gradient backgrounds for cards
  const gradients = {
    blue: "from-blue-500/10 to-cyan-500/5",
    purple: "from-purple-500/10 to-pink-500/5",
    green: "from-green-500/10 to-emerald-500/5",
    orange: "from-orange-500/10 to-yellow-500/5",
    pink: "from-pink-500/10 to-rose-500/5"
  };
  
  // Render content
  const renderContent = () => {
    switch (activeNav) {
      case "dashboard":
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 via-cyan-500 to-green-500 rounded-3xl p-8 text-white shadow-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold mb-2">こんにちは！👋</h1>
                  <p className="text-white/80">今日のAI電話対応状況をご確認ください</p>
                </div>
                <button 
                  onClick={fetchData} 
                  className="p-3 bg-white/20 backdrop-blur rounded-xl hover:bg-white/30 transition-all"
                >
                  <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                </button>
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                <div className="bg-white/20 backdrop-blur rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <PhoneIncoming className="text-white/60" size={20} />
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full">今日</span>
                  </div>
                  <p className="text-3xl font-bold">{stats.todayCalls}</p>
                  <p className="text-sm text-white/70 mt-1">通話件数</p>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="text-white/60" size={20} />
                    <TrendingUp className="text-green-300" size={16} />
                  </div>
                  <p className="text-3xl font-bold">{stats.avgDuration}</p>
                  <p className="text-sm text-white/70 mt-1">平均時間</p>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Zap className="text-white/60" size={20} />
                    <span className="text-xs text-green-300">+5%</span>
                  </div>
                  <p className="text-3xl font-bold">{stats.aiResolution}%</p>
                  <p className="text-sm text-white/70 mt-1">AI解決率</p>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Star className="text-white/60" size={20} />
                    <span className="text-xs text-yellow-300">⭐</span>
                  </div>
                  <p className="text-3xl font-bold">{stats.satisfaction}%</p>
                  <p className="text-sm text-white/70 mt-1">満足度</p>
                </div>
              </div>
            </div>
            
            {/* Active Agents */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-xl">
                        <Bot className="text-purple-600" size={20} />
                      </div>
                      <h2 className="font-bold text-gray-900">稼働中エージェント</h2>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      {agents.length} Active
                    </span>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {agents.slice(0, 3).map((agent, i) => (
                    <div key={agent.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${["from-blue-500 to-cyan-500", "from-purple-500 to-pink-500", "from-green-500 to-emerald-500"][i]} flex items-center justify-center text-white font-bold shadow-lg`}>
                          {agent.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{agent.name}</p>
                          <p className="text-xs text-gray-500">本日 {agent.calls_today || 0}件処理</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-xs text-gray-500">稼働中</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Recent Calls */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-cyan-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-xl">
                        <PhoneIncoming className="text-blue-600" size={20} />
                      </div>
                      <h2 className="font-bold text-gray-900">最新の通話</h2>
                    </div>
                    <button 
                      onClick={() => setActiveNav("calls")}
                      className="text-blue-600 text-sm font-medium hover:text-blue-700"
                    >
                      すべて見る →
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {calls.slice(0, 3).map((call) => (
                    <div 
                      key={call.id} 
                      onClick={() => setSelectedCall(call)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <User size={16} className="text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{call.from || "不明"}</p>
                          <p className="text-xs text-gray-500">{call.time} · {call.duration}</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
        
      case "agents":
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">エージェント管理</h1>
                <p className="text-gray-500 mt-1">AIエージェントの作成と管理</p>
              </div>
              <button
                onClick={() => setShowCreateAgent(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                <Plus size={20} />
                新規作成
              </button>
            </div>
            
            {/* Agent Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent, i) => (
                <div key={agent.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all">
                  <div className={`h-2 bg-gradient-to-r ${["from-blue-500 to-cyan-500", "from-purple-500 to-pink-500", "from-green-500 to-emerald-500"][i % 3]}`}></div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                        <Bot size={24} className="text-purple-600" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-xs text-gray-500">稼働中</span>
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">{agent.name}</h3>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Mic size={14} />
                        <span>{agent.voice}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Globe size={14} />
                        <span>{agent.lang === "ja" ? "日本語" : agent.lang}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Activity size={14} />
                        <span>本日 {agent.calls_today || 0}件</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          console.log('[ModernDashboard] Opening agent config for:', agent.id, agent.name);
                          console.log('[ModernDashboard] Setting configAgentId to:', agent.id);
                          setConfigAgentId(agent.id);
                          console.log('[ModernDashboard] Setting showAgentConfig to true');
                          setShowAgentConfig(true);
                          console.log('[ModernDashboard] State after click:', {
                            configAgentId: agent.id,
                            showAgentConfig: true
                          });
                        }}
                        className="flex-1 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium flex items-center justify-center gap-1">
                        <Cog size={14} />
                        設定
                      </button>
                      <button 
                        onClick={() => openEditModal(agent)}
                        className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
                        編集
                      </button>
                      <button 
                        onClick={() => alert(`テスト通話機能は準備中です`)}
                        className="flex-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium">
                        テスト
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Add New Card */}
              <button
                onClick={() => setShowCreateAgent(true)}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all border-2 border-dashed border-gray-200 min-h-[280px] flex flex-col items-center justify-center group"
              >
                <div className="p-3 bg-gray-100 rounded-xl mb-3 group-hover:scale-110 transition-transform">
                  <Plus size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">新規エージェント</p>
                <p className="text-gray-400 text-sm mt-1">クリックして作成</p>
              </button>
            </div>
          </div>
        );
        
      case "calls":
        return (
          <div className="space-y-6">
            {/* Header with Filters */}
            <div className="flex flex-col lg:flex-row justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">通話履歴</h1>
                <p className="text-gray-500 mt-1">すべての通話記録を管理</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="検索..."
                    className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2">
                  <Filter size={16} />
                  フィルター
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
                  <Download size={16} />
                  エクスポート
                </button>
              </div>
            </div>
            
            {/* Calls Table */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">時刻</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">お客様</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">電話番号</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">要件</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">緊急度</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">時間</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">状態</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {calls.map((call) => (
                      <tr key={call.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">{call.time}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{call.customer_name || "不明"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{call.phone_number || call.from || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                          {call.requirement || call.summary || "分析中..."}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            call.urgency === "高" ? "bg-red-100 text-red-700" :
                            call.urgency === "中" ? "bg-yellow-100 text-yellow-700" :
                            "bg-green-100 text-green-700"
                          }`}>
                            {call.urgency || "中"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{call.duration}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            call.response_status === "解決済み" ? "bg-green-100 text-green-800" :
                            call.response_status === "対応中" ? "bg-blue-100 text-blue-800" :
                            call.response_status === "保留" ? "bg-yellow-100 text-yellow-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {call.response_status || "未対応"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            {call.recording_url && (
                              <button
                                onClick={() => {
                                  const audio = new Audio(call.recording_url);
                                  if (playingAudio === call.id) {
                                    audio.pause();
                                    setPlayingAudio(null);
                                  } else {
                                    audio.play();
                                    setPlayingAudio(call.id);
                                  }
                                }}
                                className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors group"
                                title="再生"
                              >
                                {playingAudio === call.id ? (
                                  <Pause size={16} className="text-blue-600" />
                                ) : (
                                  <Play size={16} className="text-blue-600 group-hover:text-blue-700" />
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedCallDetail(call);
                                setShowCallDetail(true);
                              }}
                              className="p-1.5 hover:bg-purple-100 rounded-lg transition-colors group"
                              title="文字起こしを見る"
                            >
                              <FileText size={16} className="text-purple-600 group-hover:text-purple-700" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCallDetail(call);
                                setShowCallDetail(true);
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical size={16} className="text-gray-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
        
      case "numbers":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">電話番号管理</h1>
                <p className="text-gray-500 mt-1">受信用電話番号の設定</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/admin/agent-builder"
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  <Zap size={16} />
                  AIエージェント自動作成
                </a>
                <a
                  href="/admin/phone-numbers"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Settings size={16} />
                  番号管理・050発行
                </a>
              </div>
            </div>

            <div className="grid gap-4">
              {phoneNumbers.map((number) => (
                <div key={number.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-xl">
                        <Phone size={24} className="text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{number.number}</h3>
                        <p className="text-gray-500 text-sm mt-1">{number.nickname}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        number.agent_id
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {number.agent_id ? '有効' : 'エージェント未設定'}
                      </span>
                      <a
                        href="/admin/phone-numbers"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Settings size={16} className="text-gray-500" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
              {phoneNumbers.length === 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-10 text-center text-gray-400">
                  <Phone size={40} className="mx-auto mb-3 text-gray-300" />
                  <p>番号が見つかりません</p>
                  <a href="/admin/phone-numbers" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
                    電話番号管理ページで確認・インポート →
                  </a>
                </div>
              )}
            </div>
          </div>
        );
        
      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">通知設定</h1>
              <p className="text-gray-500 mt-1">外部サービスとの連携</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Slack */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-purple-100 rounded-xl">
                        <MessageSquare size={24} className="text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Slack</h3>
                        <p className="text-sm text-gray-500">
                          {slackWebhook ? "接続済み" : "未接続"}
                        </p>
                      </div>
                    </div>
                    {slackWebhook && (
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    通話終了時に自動でSlackに通知を送信します
                  </p>
                  <button
                    onClick={() => setShowNotificationConfig("Slack")}
                    className="w-full px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors font-medium"
                  >
                    {slackWebhook ? "設定変更" : "接続する"}
                  </button>
                </div>
              </div>
              
              {/* LINE */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500"></div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-green-100 rounded-xl">
                        <Send size={24} className="text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">LINE</h3>
                        <p className="text-sm text-gray-500">
                          {lineToken ? "接続済み" : "未接続"}
                        </p>
                      </div>
                    </div>
                    {lineToken && (
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    重要な通話をLINEでリアルタイム通知
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowNotificationConfig("LINE")}
                      className="w-full px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors font-medium"
                    >
                      {lineToken ? "設定変更" : "接続する"}
                    </button>
                    {lineToken && (
                      <button
                        onClick={async () => {
                          const token = localStorage.getItem('line_notify_token');
                          if (!token) {
                            alert('LINE Notifyトークンが設定されていません');
                            return;
                          }
                          
                          try {
                            const res = await fetch('/api/notify/line', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                token,
                                call: {
                                  from: 'テスト発信者',
                                  duration: '1:23',
                                  summary: 'これはテスト通知です',
                                  urgency: '低',
                                  sentiment: 'positive',
                                  start_timestamp: Date.now()
                                }
                              })
                            });
                            
                            if (res.ok) {
                              alert('テスト通知を送信しました。LINEをご確認ください。');
                            } else {
                              alert('通知の送信に失敗しました');
                            }
                          } catch (error) {
                            console.error('Test notification error:', error);
                            alert('通知の送信に失敗しました');
                          }
                        }}
                        className="w-full px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <Send size={16} />
                        テスト通知を送信
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Settings size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">このページは開発中です</p>
            </div>
          </div>
        );
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} fixed lg:static inset-y-0 left-0 z-40 w-72 bg-white border-r transition-transform shadow-xl lg:shadow-none`}>
        <div className="p-6 border-b bg-white">
          <Logo size="lg" />
          <p className="text-gray-500 text-sm mt-2 ml-14">AI電話対応サービス</p>
        </div>
        
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveNav(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? `bg-gradient-to-r ${gradients[item.color as keyof typeof gradients]} text-${item.color}-600 shadow-sm`
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon size={20} className={isActive ? `text-${item.color}-600` : "text-gray-400"} />
                {item.label}
                {isActive && (
                  <div className="ml-auto w-1 h-4 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
                )}
              </button>
            );
          })}
        </nav>
        
        {/* User Info & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <User size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user?.name || 'ユーザー'}</p>
                <p className="text-xs text-gray-500">{user?.role === 'admin' ? '管理者' : 'ユーザー'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors group"
              title="ログアウト"
            >
              <LogOut size={18} className="text-gray-500 group-hover:text-red-500" />
            </button>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1">
        {/* Top Bar */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-3 ml-auto">
              <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                <Bell size={20} className="text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <Logo size="sm" showText={false} />
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {renderContent()}
        </div>
      </main>
      
      {/* Create Agent Modal */}
      {showCreateAgent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-6">新規エージェント作成</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">エージェント名</label>
                <input
                  type="text"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="例: 営業受付AI"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">音声ID</label>
                <input
                  type="text"
                  value={newAgent.voice_id}
                  onChange={(e) => setNewAgent({ ...newAgent, voice_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="例: 11labs-Adrian"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">言語</label>
                <select
                  value={newAgent.language}
                  onChange={(e) => setNewAgent({ ...newAgent, language: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ja">日本語</option>
                  <option value="en">英語</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateAgent}
                disabled={creatingAgent || !newAgent.name}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {creatingAgent ? "作成中..." : "作成"}
              </button>
              <button
                onClick={() => setShowCreateAgent(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Agent Modal */}
      {showEditAgent && selectedAgent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-6">エージェント編集</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">エージェント名</label>
                <input
                  type="text"
                  value={editingAgent.name}
                  onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="例: 営業受付AI"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">音声ID</label>
                <input
                  type="text"
                  value={editingAgent.voice_id}
                  onChange={(e) => setEditingAgent({ ...editingAgent, voice_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="例: 11labs-Adrian"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">言語</label>
                <select
                  value={editingAgent.language}
                  onChange={(e) => setEditingAgent({ ...editingAgent, language: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ja">日本語</option>
                  <option value="en">英語</option>
                </select>
              </div>
              <div className="text-xs text-gray-500">
                <p>エージェントID: {selectedAgent.id}</p>
                <p>本日の通話: {selectedAgent.calls_today}件</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateAgent}
                disabled={updatingAgent || !editingAgent.name}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {updatingAgent ? "更新中..." : "更新"}
              </button>
              <button
                onClick={() => {
                  setShowEditAgent(false);
                  setSelectedAgent(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Notification Config Modal */}
      {showNotificationConfig && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-6">{showNotificationConfig}設定</h3>
            <div className="space-y-4">
              {showNotificationConfig === "Slack" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
                  <input
                    type="text"
                    value={slackWebhook}
                    onChange={(e) => setSlackWebhook(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://hooks.slack.com/services/..."
                  />
                  <p className="text-xs text-gray-500 mt-2">SlackのIncoming Webhook URLを入力してください</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">アクセストークン</label>
                  <input
                    type="text"
                    value={lineToken}
                    onChange={(e) => setLineToken(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="LINE Notify トークン"
                  />
                  <p className="text-xs text-gray-500 mt-2">LINE Notifyのアクセストークンを入力してください</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleSaveNotificationConfig(showNotificationConfig)}
                disabled={savingConfig}
                className={`flex-1 px-4 py-2 ${
                  showNotificationConfig === "Slack"
                    ? "bg-gradient-to-r from-blue-600 to-green-600"
                    : "bg-gradient-to-r from-green-600 to-emerald-600"
                } text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50`}
              >
                {savingConfig ? "保存中..." : "保存"}
              </button>
              <button
                onClick={() => setShowNotificationConfig(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Call Detail Modal */}
      {selectedCall && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">通話詳細</h3>
                  <p className="text-sm text-gray-500 mt-1">{selectedCall.time}</p>
                </div>
                <button 
                  onClick={() => setSelectedCall(null)} 
                  className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Call Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">発信者</p>
                  <p className="font-medium text-gray-900">{selectedCall.from || "不明"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">通話時間</p>
                  <p className="font-medium text-gray-900">{selectedCall.duration}</p>
                </div>
              </div>
              
              {/* Summary */}
              {selectedCall.summary && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">要約</p>
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <p className="text-gray-800">{selectedCall.summary}</p>
                  </div>
                </div>
              )}
              
              {/* Recording */}
              {selectedCall.recording_url && (
                <div>
                  <p className="text-sm text-gray-500 mb-3">録音</p>
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                    <button
                      onClick={() => setPlayingAudio(playingAudio === selectedCall.id ? null : selectedCall.id)}
                      className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-all"
                    >
                      {playingAudio === selectedCall.id ? (
                        <Pause size={20} className="text-purple-600" />
                      ) : (
                        <Play size={20} className="text-purple-600" />
                      )}
                      <span className="font-medium text-gray-900">
                        {playingAudio === selectedCall.id ? "停止" : "再生"}
                      </span>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Transcript */}
              {selectedCall.transcript && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">文字起こし</p>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedCall.transcript}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Agent Configuration Modal */}
      {console.log('[ModernDashboard] Render check:', {
        showAgentConfig,
        configAgentId,
        shouldRenderModal: showAgentConfig && configAgentId
      })}
      {showAgentConfig && configAgentId && (
        <>
          {console.log('[ModernDashboard] Rendering AgentConfigJapanese with agentId:', configAgentId)}
          <AgentConfigJapanese 
            agentId={configAgentId}
            onClose={() => {
              console.log('[ModernDashboard] Closing agent config');
              setShowAgentConfig(false);
              setConfigAgentId(null);
            }}
            onSave={(config) => {
              console.log("[ModernDashboard] Saved config:", config);
              fetchData();
              setShowAgentConfig(false);
              setConfigAgentId(null);
            }}
          />
        </>
      )}
      
      {/* Call Detail Modal */}
      {showCallDetail && selectedCallDetail && (
        <CallDetailModal
          call={selectedCallDetail}
          onClose={() => {
            setShowCallDetail(false);
            setSelectedCallDetail(null);
            // Refresh call data after modal closes
            fetchData();
          }}
        />
      )}
    </div>
  );
}