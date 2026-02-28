'use client';

import { useState, useEffect } from "react";
import { Phone, Plus, Settings, Bell, BarChart3, Bot, Hash, X, Mic, Play, Pause, MessageSquare, Volume2, CheckCircle, ChevronRight, Menu, RefreshCw } from "lucide-react";

export default function InteractiveDashboard() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Agent Management States
  const [agents, setAgents] = useState<any[]>([]);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: "", voice_id: "", language: "ja" });
  const [creatingAgent, setCreatingAgent] = useState(false);
  
  // Notification States
  const [showNotificationConfig, setShowNotificationConfig] = useState<string | null>(null);
  const [slackWebhook, setSlackWebhook] = useState("");
  const [lineToken, setLineToken] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  
  // Call States
  const [calls, setCalls] = useState<any[]>([]);
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  
  // Phone Numbers
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  
  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [agentsRes, callsRes, numbersRes] = await Promise.all([
        fetch("/api/agents"),
        fetch("/api/calls?limit=20"),
        fetch("/api/phone-numbers")
      ]);
      
      if (agentsRes.ok) setAgents(await agentsRes.json());
      if (callsRes.ok) setCalls(await callsRes.json());
      if (numbersRes.ok) setPhoneNumbers(await numbersRes.json());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Create new agent
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
      }
    } catch (error) {
      console.error("Failed to create agent:", error);
    } finally {
      setCreatingAgent(false);
    }
  };
  
  // Save notification config
  const handleSaveNotificationConfig = async (type: string) => {
    setSavingConfig(true);
    try {
      const config = type === "Slack" 
        ? { webhook_url: slackWebhook }
        : { access_token: lineToken };
        
      const res = await fetch("/api/websocket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: type.toLowerCase(),
          config
        })
      });
      
      if (res.ok) {
        setShowNotificationConfig(null);
        alert(`${type}の設定を保存しました`);
      }
    } catch (error) {
      console.error("Failed to save config:", error);
    } finally {
      setSavingConfig(false);
    }
  };
  
  // Make outbound call
  const handleMakeCall = async (toNumber: string) => {
    const fromNumber = phoneNumbers[0]?.number;
    if (!fromNumber) {
      alert("発信元の電話番号が設定されていません");
      return;
    }
    
    try {
      const res = await fetch("/api/make-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_number: toNumber,
          from_number: fromNumber,
          agent_id: agents[0]?.id
        })
      });
      
      if (res.ok) {
        alert("発信を開始しました");
        fetchData();
      }
    } catch (error) {
      console.error("Failed to make call:", error);
    }
  };
  
  // Navigation items
  const navItems = [
    { id: "dashboard", label: "ダッシュボード", icon: BarChart3 },
    { id: "agents", label: "エージェント", icon: Bot },
    { id: "calls", label: "通話履歴", icon: Phone },
    { id: "numbers", label: "電話番号", icon: Hash },
    { id: "notifications", label: "通知設定", icon: Bell },
    { id: "settings", label: "設定", icon: Settings }
  ];
  
  // Render content based on active nav
  const renderContent = () => {
    switch (activeNav) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">ダッシュボード</h2>
              <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg">
                <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl border">
                <p className="text-sm text-gray-500">本日の通話</p>
                <p className="text-3xl font-bold">{calls.length}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border">
                <p className="text-sm text-gray-500">稼働エージェント</p>
                <p className="text-3xl font-bold">{agents.length}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border">
                <p className="text-sm text-gray-500">電話番号</p>
                <p className="text-3xl font-bold">{phoneNumbers.length}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border">
                <p className="text-sm text-gray-500">AI解決率</p>
                <p className="text-3xl font-bold">85%</p>
              </div>
            </div>
            
            {/* Recent Calls */}
            <div className="bg-white rounded-xl border">
              <div className="p-4 border-b">
                <h3 className="font-semibold">最近の通話</h3>
              </div>
              <div className="divide-y">
                {calls.slice(0, 5).map(call => (
                  <div key={call.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedCall(call)}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{call.from || "不明"}</p>
                        <p className="text-sm text-gray-500">{call.summary || "要約なし"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">{call.time}</p>
                        <p className="text-sm font-medium">{call.duration}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
        
      case "agents":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">エージェント管理</h2>
              <button
                onClick={() => setShowCreateAgent(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus size={20} />
                新規作成
              </button>
            </div>
            
            <div className="grid gap-4">
              {agents.map(agent => (
                <div key={agent.id} className="bg-white p-6 rounded-xl border">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{agent.name}</h3>
                      <div className="flex gap-4 mt-2 text-sm text-gray-500">
                        <span>音声: {agent.voice}</span>
                        <span>言語: {agent.lang}</span>
                        <span>本日: {agent.calls_today}件</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                        編集
                      </button>
                      <button className="px-3 py-1 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100">
                        テスト
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        
      case "calls":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">通話履歴</h2>
            
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">時刻</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">発信者</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">要約</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">時間</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状態</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {calls.map(call => (
                    <tr key={call.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{call.time}</td>
                      <td className="px-4 py-3 text-sm">{call.from || "不明"}</td>
                      <td className="px-4 py-3 text-sm truncate max-w-xs">{call.summary || "-"}</td>
                      <td className="px-4 py-3 text-sm">{call.duration}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                          {call.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => setSelectedCall(call)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          詳細
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
        
      case "numbers":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">電話番号管理</h2>
            
            <div className="grid gap-4">
              {phoneNumbers.map(number => (
                <div key={number.id} className="bg-white p-6 rounded-xl border">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-lg">{number.number}</h3>
                      <p className="text-sm text-gray-500">{number.nickname}</p>
                    </div>
                    <button className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                      設定
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        
      case "notifications":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">通知設定</h2>
            
            <div className="grid gap-4">
              <div className="bg-white p-6 rounded-xl border">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">Slack</h3>
                    <p className="text-sm text-gray-500">
                      {slackWebhook ? "接続済み" : "未接続"}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNotificationConfig("Slack")}
                    className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                  >
                    設定
                  </button>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl border">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">LINE</h3>
                    <p className="text-sm text-gray-500">
                      {lineToken ? "接続済み" : "未接続"}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNotificationConfig("LINE")}
                    className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                  >
                    設定
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="flex items-center justify-center h-64 text-gray-400">
            <p>開発中...</p>
          </div>
        );
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r transition-transform`}>
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Retell Dashboard</h1>
        </div>
        <nav className="p-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveNav(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                activeNav === item.id
                  ? "bg-blue-50 text-blue-600"
                  : "hover:bg-gray-50"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 p-6">
        {/* Mobile menu button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden mb-4 p-2 hover:bg-gray-100 rounded-lg"
        >
          <Menu size={24} />
        </button>
        
        {renderContent()}
      </main>
      
      {/* Create Agent Modal */}
      {showCreateAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">新規エージェント作成</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">エージェント名</label>
                <input
                  type="text"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="例: 営業受付AI"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">音声ID</label>
                <input
                  type="text"
                  value={newAgent.voice_id}
                  onChange={(e) => setNewAgent({ ...newAgent, voice_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="例: 11labs-Adrian"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">言語</label>
                <select
                  value={newAgent.language}
                  onChange={(e) => setNewAgent({ ...newAgent, language: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="ja">日本語</option>
                  <option value="en">英語</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateAgent}
                disabled={creatingAgent || !newAgent.name}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creatingAgent ? "作成中..." : "作成"}
              </button>
              <button
                onClick={() => setShowCreateAgent(false)}
                className="flex-1 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Notification Config Modal */}
      {showNotificationConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">{showNotificationConfig}設定</h3>
            <div className="space-y-4">
              {showNotificationConfig === "Slack" ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Webhook URL</label>
                  <input
                    type="text"
                    value={slackWebhook}
                    onChange={(e) => setSlackWebhook(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">アクセストークン</label>
                  <input
                    type="text"
                    value={lineToken}
                    onChange={(e) => setLineToken(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="LINE Notify トークン"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => handleSaveNotificationConfig(showNotificationConfig)}
                disabled={savingConfig}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {savingConfig ? "保存中..." : "保存"}
              </button>
              <button
                onClick={() => setShowNotificationConfig(null)}
                className="flex-1 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Call Detail Modal */}
      {selectedCall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">通話詳細</h3>
              <button onClick={() => setSelectedCall(null)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">発信者</p>
                <p className="font-medium">{selectedCall.from || "不明"}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">時刻</p>
                <p className="font-medium">{selectedCall.time}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">時間</p>
                <p className="font-medium">{selectedCall.duration}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">要約</p>
                <p className="font-medium">{selectedCall.summary || "要約なし"}</p>
              </div>
              
              {selectedCall.transcript && (
                <div>
                  <p className="text-sm text-gray-500">文字起こし</p>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedCall.transcript}</p>
                  </div>
                </div>
              )}
              
              {selectedCall.recording_url && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">録音</p>
                  <button
                    onClick={() => setPlayingAudio(playingAudio === selectedCall.id ? null : selectedCall.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    {playingAudio === selectedCall.id ? <Pause size={16} /> : <Play size={16} />}
                    {playingAudio === selectedCall.id ? "停止" : "再生"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}