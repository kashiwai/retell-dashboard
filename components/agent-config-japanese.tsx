'use client';

import { useState, useEffect } from "react";
import { 
  Settings, Plus, X, ChevronRight, ChevronDown, Info, Save, 
  Phone, MessageSquare, Brain, Volume2, Mic, Clock, Shield,
  Globe, Database, Webhook, AlertCircle, Check, Copy, TestTube,
  Zap, Calendar, PhoneOff, Key, Timer, Archive, Link, Variable,
  FileText, Bot, Headphones, Filter, Bell, Lock, Server, Sparkles
} from "lucide-react";

interface AgentConfigProps {
  agentId: string;
  onClose: () => void;
  onSave: (config: any) => void;
}

export default function AgentConfigJapanese({ agentId, onClose, onSave }: AgentConfigProps) {
  const [activeSection, setActiveSection] = useState("script");
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({
    // トークスクリプト
    script: {
      greeting: "お電話ありがとうございます。〇〇会社の受付AIです。本日はどのようなご用件でしょうか？",
      main_prompt: `あなたは日本語の電話受付AIアシスタントです。
以下のガイドラインに従って対応してください：

1. 丁寧で自然な日本語で話してください
2. お客様の名前と用件を確認してください
3. 必要に応じて担当者に取り次ぐか、折り返しの約束をしてください
4. 常に親切で忍耐強く対応してください

重要な情報：
- 営業時間: 平日 9:00-18:00
- 土日祝日: 休業
- 緊急連絡先: 080-1234-5678`,
      ending: "お電話ありがとうございました。失礼いたします。",
      hold_message: "少々お待ちください。担当者におつなぎいたします。",
      voicemail: "ただいま電話に出ることができません。発信音の後にメッセージをお残しください。"
    },
    
    // 基本設定
    general: {
      name: "",
      voice_id: "jp-female-1",
      language: "ja",
      voice_speed: 1.0,
      voice_pitch: 1.0,
      voice_temperature: 0.7
    },
    
    // 機能設定
    functions: {
      end_call: true,
      transfer_call: true,
      calendar_booking: false,
      send_sms: false,
      send_email: false,
      custom_functions: []
    },
    
    // ナレッジベース
    knowledge_base: {
      enabled: false,
      documents: [],
      retrieval_chunks: 3,
      similarity_threshold: 0.7,
      max_tokens: 500
    },
    
    // 会話設定
    conversation: {
      // 応答設定
      responsiveness: 0.8,
      response_delay: 500,
      
      // 割り込み設定
      interruption_sensitivity: 0.6,
      allow_interruption: true,
      
      // 相づち設定
      enable_backchanneling: true,
      backchannel_frequency: 0.8,
      backchannel_words: ["はい", "ええ", "なるほど", "そうですね", "承知しました", "かしこまりました"],
      
      // リマインダー設定
      reminder_enabled: true,
      reminder_interval: 15,
      reminder_max_count: 3,
      reminder_message: "お客様、まだいらっしゃいますか？"
    },
    
    // 音声設定
    speech: {
      // 背景音
      background_sound: "none",
      background_volume: 0.1,
      
      // 音声処理
      noise_reduction: true,
      echo_cancellation: true,
      auto_gain_control: true,
      
      // 音声正規化
      enable_normalization: true,
      number_format: "japanese",
      date_format: "japanese",
      
      // 発音ガイド
      pronunciation_guide: []
    },
    
    // 文字起こし設定
    transcription: {
      provider: "whisper",
      model: "large-v2",
      language: "ja",
      
      // ノイズ処理
      denoising_mode: "aggressive",
      remove_background_speech: true,
      
      // 最適化
      optimization: "accuracy",
      
      // 強調キーワード
      boosted_keywords: "御社,弊社,株式会社,お客様,承知しました,かしこまりました",
      
      // フィルター
      profanity_filter: true,
      remove_fillers: false
    },
    
    // 通話設定
    call: {
      // 基本設定
      max_duration: 3600,
      warning_before_end: 60,
      
      // 無音検出
      silence_detection: true,
      silence_timeout: 180,
      silence_threshold: -40,
      
      // 留守電検出
      voicemail_detection: true,
      voicemail_action: "leave_message",
      
      // IVR設定
      ivr_detection: true,
      ivr_navigation: false,
      
      // キーパッド
      keypad_detection: false,
      keypad_timeout: 3,
      termination_key: "#",
      
      // 呼び出し設定
      ring_timeout: 30,
      retry_count: 2,
      retry_interval: 10
    },
    
    // 分析設定
    analytics: {
      // リアルタイム分析
      sentiment_analysis: true,
      emotion_detection: true,
      intent_classification: true,
      
      // 後処理分析
      call_summary: true,
      action_items: true,
      follow_up_required: true,
      
      // 品質評価
      call_quality_score: true,
      agent_performance: true,
      customer_satisfaction: true
    },
    
    // セキュリティ設定
    security: {
      // データ保存
      data_retention: "30days",
      recording_enabled: true,
      transcript_enabled: true,
      
      // 個人情報保護
      pii_redaction: true,
      pii_categories: ["name", "phone", "email", "address", "credit_card"],
      
      // アクセス制御
      require_auth: true,
      ip_whitelist: [],
      
      // 暗号化
      encryption_at_rest: true,
      encryption_in_transit: true
    },
    
    // 通知設定
    notifications: {
      // Webhook
      webhook_enabled: false,
      webhook_url: "",
      webhook_secret: "",
      webhook_events: ["call_started", "call_ended", "error", "transfer"],
      
      // メール通知
      email_enabled: false,
      email_addresses: [],
      
      // Slack通知
      slack_enabled: false,
      slack_webhook: "",
      
      // LINE通知
      line_enabled: false,
      line_token: ""
    }
  });
  
  const [isSaving, setIsSaving] = useState(false);
  
  // Load existing agent data
  useEffect(() => {
    const loadAgentData = async () => {
      if (!agentId) {
        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`/api/agents/${agentId}`);
        if (res.ok) {
          const agentData = await res.json();
          
          // Only update with actual data from API - no defaults
          setConfig(prevConfig => {
            const newConfig = { ...prevConfig };
            
            // Update general settings
            if (agentData.agent_name) newConfig.general.name = agentData.agent_name;
            if (agentData.voice_id) newConfig.general.voice_id = agentData.voice_id;
            if (agentData.language) newConfig.general.language = agentData.language;
            if (agentData.voice_speed !== undefined) newConfig.general.voice_speed = agentData.voice_speed;
            if (agentData.voice_temperature !== undefined) {
              newConfig.general.voice_pitch = agentData.voice_temperature;
              newConfig.general.voice_temperature = agentData.voice_temperature;
            }
            
            // Update script data - check multiple possible fields
            if (agentData.script) {
              // If script object exists, use it
              newConfig.script = agentData.script;
            } else if (agentData.prompt || agentData.general_prompt || agentData.begin_message) {
              // Otherwise, construct from individual fields
              newConfig.script = {
                greeting: agentData.begin_message || prevConfig.script.greeting,
                main_prompt: agentData.prompt || agentData.general_prompt || prevConfig.script.main_prompt,
                ending: agentData.end_message || prevConfig.script.ending,
                hold_message: prevConfig.script.hold_message,
                voicemail: prevConfig.script.voicemail
              };
            }
            
            // Update conversation settings
            if (agentData.interruption_sensitivity !== undefined) {
              newConfig.conversation.interruption_sensitivity = agentData.interruption_sensitivity;
            }
            if (agentData.enable_backchannel !== undefined) {
              newConfig.conversation.enable_backchanneling = agentData.enable_backchannel;
            }
            if (agentData.backchannel_frequency !== undefined) {
              newConfig.conversation.backchannel_frequency = agentData.backchannel_frequency;
            }
            if (agentData.backchannel_words?.length > 0) {
              newConfig.conversation.backchannel_words = agentData.backchannel_words;
            }
            if (agentData.reminder_trigger_ms !== undefined) {
              newConfig.conversation.reminder_enabled = agentData.reminder_trigger_ms > 0;
              newConfig.conversation.reminder_interval = agentData.reminder_trigger_ms / 1000;
            }
            if (agentData.reminder_max_count !== undefined) {
              newConfig.conversation.reminder_max_count = agentData.reminder_max_count;
            }
            
            // Update notification settings
            if (agentData.webhook_url) {
              newConfig.notifications.webhook_enabled = true;
              newConfig.notifications.webhook_url = agentData.webhook_url;
            }
            
            // Merge any additional settings
            if (agentData.settings) {
              Object.assign(newConfig, agentData.settings);
            }
            
            return newConfig;
          });
        } else {
          // Show error code only
          const errorData = await res.json().catch(() => ({}));
          console.error(`Error loading agent: ${res.status}`, errorData);
          alert(`エージェントデータの読み込みに失敗しました。エラーコード: ${res.status}`);
        }
      } catch (error) {
        console.error('Failed to load agent data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert(`エージェントデータの読み込みに失敗しました。エラー: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadAgentData();
  }, [agentId]);
  
  const sections = [
    { id: "script", label: "トークスクリプト", icon: FileText, color: "purple" },
    { id: "general", label: "基本設定", icon: Settings, color: "blue" },
    { id: "functions", label: "機能設定", icon: Zap, color: "yellow" },
    { id: "conversation", label: "会話設定", icon: MessageSquare, color: "green" },
    { id: "speech", label: "音声設定", icon: Volume2, color: "pink" },
    { id: "transcription", label: "文字起こし", icon: Mic, color: "indigo" },
    { id: "call", label: "通話設定", icon: Phone, color: "red" },
    { id: "analytics", label: "分析設定", icon: Brain, color: "purple" },
    { id: "security", label: "セキュリティ", icon: Shield, color: "gray" },
    { id: "notifications", label: "通知設定", icon: Bell, color: "orange" }
  ];
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/agent-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId, config })
      });
      if (res.ok) {
        onSave(config);
        alert("設定を保存しました");
      } else {
        alert("設定の保存に失敗しました");
      }
    } catch (error) {
      console.error("Failed to save:", error);
      alert("エラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex z-50">
      <div className="flex-1 bg-gray-50 flex">
        {/* サイドバー */}
        <div className="w-72 bg-white shadow-xl">
          <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-white">エージェント設定</h2>
              <button 
                onClick={onClose}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
            <p className="text-white/80 text-sm">ID: {agentId}</p>
          </div>
          
          <nav className="p-3">
            {sections.map(section => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all mb-1 ${
                    isActive
                      ? `bg-gradient-to-r from-${section.color}-50 to-${section.color}-100 text-${section.color}-700 shadow-sm`
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon size={18} className={isActive ? `text-${section.color}-600` : "text-gray-400"} />
                  {section.label}
                  {isActive && (
                    <ChevronRight size={14} className="ml-auto" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
        
        {/* メインコンテンツ */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">エージェント情報を読み込んでいます...</p>
              </div>
            </div>
          ) : (
          <div className="p-8">
            {/* トークスクリプト */}
            {activeSection === "script" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                      <FileText size={24} className="text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">トークスクリプト</h3>
                      <p className="text-gray-500">AIエージェントの会話内容を設定します</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* 挨拶文 */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        🎯 最初の挨拶
                        <span className="ml-2 text-xs text-gray-500 font-normal">電話に出た時の第一声</span>
                      </label>
                      <textarea
                        value={config.script.greeting}
                        onChange={(e) => setConfig({...config, script: {...config.script, greeting: e.target.value}})}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                        rows={3}
                        placeholder="例: お電話ありがとうございます..."
                      />
                    </div>
                    
                    {/* メインプロンプト */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        📝 メインスクリプト
                        <span className="ml-2 text-xs text-gray-500 font-normal">AIの振る舞いと対応方法を詳細に記述</span>
                      </label>
                      <textarea
                        value={config.script.main_prompt}
                        onChange={(e) => setConfig({...config, script: {...config.script, main_prompt: e.target.value}})}
                        className="w-full px-4 py-4 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-purple-50/30 text-sm leading-relaxed"
                        rows={15}
                        placeholder="AIエージェントへの詳細な指示を記入..."
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        💡 ヒント: 会社情報、営業時間、対応方法、禁止事項などを明確に記載してください
                      </p>
                    </div>
                    
                    {/* 終了文 */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        👋 終了の挨拶
                        <span className="ml-2 text-xs text-gray-500 font-normal">通話を終了する時の言葉</span>
                      </label>
                      <textarea
                        value={config.script.ending}
                        onChange={(e) => setConfig({...config, script: {...config.script, ending: e.target.value}})}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                        rows={2}
                        placeholder="例: お電話ありがとうございました..."
                      />
                    </div>
                    
                    {/* 保留メッセージ */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          ⏸️ 保留メッセージ
                        </label>
                        <textarea
                          value={config.script.hold_message}
                          onChange={(e) => setConfig({...config, script: {...config.script, hold_message: e.target.value}})}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                          rows={2}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          📞 留守電メッセージ
                        </label>
                        <textarea
                          value={config.script.voicemail}
                          onChange={(e) => setConfig({...config, script: {...config.script, voicemail: e.target.value}})}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 基本設定 */}
            {activeSection === "general" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl">
                      <Settings size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">基本設定</h3>
                      <p className="text-gray-500">エージェントの基本情報を設定します</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        エージェント名
                      </label>
                      <input
                        type="text"
                        value={config.general.name}
                        onChange={(e) => setConfig({...config, general: {...config.general, name: e.target.value}})}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="例: カスタマーサポートAI"
                      />
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          音声タイプ
                        </label>
                        <select
                          value={config.general.voice_id}
                          onChange={(e) => setConfig({...config, general: {...config.general, voice_id: e.target.value}})}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="jp-female-1">女性1（落ち着いた声）</option>
                          <option value="jp-female-2">女性2（明るい声）</option>
                          <option value="jp-male-1">男性1（信頼感のある声）</option>
                          <option value="jp-male-2">男性2（親しみやすい声）</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          言語
                        </label>
                        <select
                          value={config.general.language}
                          onChange={(e) => setConfig({...config, general: {...config.general, language: e.target.value}})}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="ja">日本語</option>
                          <option value="en">English</option>
                          <option value="zh">中文</option>
                          <option value="ko">한국어</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* 音声調整 */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          話す速度
                        </label>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500 w-16">遅い</span>
                          <input
                            type="range"
                            value={config.general.voice_speed}
                            onChange={(e) => setConfig({...config, general: {...config.general, voice_speed: parseFloat(e.target.value)}})}
                            className="flex-1"
                            min="0.5"
                            max="1.5"
                            step="0.1"
                          />
                          <span className="text-sm text-gray-500 w-16 text-right">速い</span>
                          <span className="ml-2 text-sm font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {config.general.voice_speed}x
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          声の高さ
                        </label>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500 w-16">低い</span>
                          <input
                            type="range"
                            value={config.general.voice_pitch}
                            onChange={(e) => setConfig({...config, general: {...config.general, voice_pitch: parseFloat(e.target.value)}})}
                            className="flex-1"
                            min="0.5"
                            max="1.5"
                            step="0.1"
                          />
                          <span className="text-sm text-gray-500 w-16 text-right">高い</span>
                          <span className="ml-2 text-sm font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {config.general.voice_pitch}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 機能設定 */}
            {activeSection === "functions" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl">
                      <Zap size={24} className="text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">機能設定</h3>
                      <p className="text-gray-500">AIエージェントが利用できる機能を設定します</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* 基本機能 */}
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">📌 基本機能</h4>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.functions.end_call}
                            onChange={(e) => setConfig({...config, functions: {...config.functions, end_call: e.target.checked}})}
                            className="w-5 h-5 text-yellow-600 rounded focus:ring-2 focus:ring-yellow-500"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">通話終了機能</p>
                            <p className="text-xs text-gray-500">AIが自動的に通話を終了できます</p>
                          </div>
                        </label>
                        
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.functions.transfer_call}
                            onChange={(e) => setConfig({...config, functions: {...config.functions, transfer_call: e.target.checked}})}
                            className="w-5 h-5 text-yellow-600 rounded focus:ring-2 focus:ring-yellow-500"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">通話転送機能</p>
                            <p className="text-xs text-gray-500">オペレーターへの転送が可能になります</p>
                          </div>
                        </label>
                      </div>
                    </div>
                    
                    {/* 連携機能 */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">🔗 外部連携機能</h4>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.functions.calendar_booking}
                            onChange={(e) => setConfig({...config, functions: {...config.functions, calendar_booking: e.target.checked}})}
                            className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">カレンダー予約</p>
                            <p className="text-xs text-gray-500">Google/Outlookカレンダーとの連携</p>
                          </div>
                        </label>
                        
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.functions.send_sms}
                            onChange={(e) => setConfig({...config, functions: {...config.functions, send_sms: e.target.checked}})}
                            className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">SMS送信</p>
                            <p className="text-xs text-gray-500">確認メッセージやリンクをSMSで送信</p>
                          </div>
                        </label>
                        
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.functions.send_email}
                            onChange={(e) => setConfig({...config, functions: {...config.functions, send_email: e.target.checked}})}
                            className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">メール送信</p>
                            <p className="text-xs text-gray-500">詳細情報をメールで送信</p>
                          </div>
                        </label>
                      </div>
                    </div>
                    
                    {/* カスタム機能 */}
                    <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">⚡ カスタム機能</h4>
                      <p className="text-sm text-gray-600 mb-4">独自のAPI連携を追加できます</p>
                      <div className="space-y-3">
                        {config.functions.custom_functions.map((func: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg">
                            <Zap size={16} className="text-purple-600" />
                            <span className="flex-1 text-sm font-medium">{func}</span>
                            <button className="text-gray-400 hover:text-red-500">
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                        <button className="w-full py-3 border-2 border-dashed border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 flex items-center justify-center gap-2 font-medium">
                          <Plus size={18} />
                          カスタム機能を追加
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* ナレッジベース */}
            {activeSection === "knowledge_base" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-xl">
                      <Database size={24} className="text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">ナレッジベース</h3>
                      <p className="text-gray-500">AIが参照する知識データベースの設定</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* 有効化 */}
                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={config.knowledge_base.enabled}
                          onChange={(e) => setConfig({...config, knowledge_base: {...config.knowledge_base, enabled: e.target.checked}})}
                          className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                        />
                        <div>
                          <p className="font-medium text-gray-800">ナレッジベースを有効化</p>
                          <p className="text-xs text-gray-500">ドキュメントやFAQを参照して回答します</p>
                        </div>
                      </label>
                    </div>
                    
                    {config.knowledge_base.enabled && (
                      <>
                        {/* ドキュメント */}
                        <div>
                          <h4 className="font-bold text-gray-800 mb-4">📄 ドキュメント管理</h4>
                          <div className="space-y-3">
                            {config.knowledge_base.documents.map((doc: any, i: number) => (
                              <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                                <FileText size={20} className="text-indigo-600" />
                                <div className="flex-1">
                                  <p className="font-medium text-gray-800">{doc}</p>
                                  <p className="text-xs text-gray-500">最終更新: 2024/01/20</p>
                                </div>
                                <button className="text-gray-400 hover:text-red-500">
                                  <X size={18} />
                                </button>
                              </div>
                            ))}
                            <button className="w-full py-3 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 flex items-center justify-center gap-2 font-medium">
                              <Plus size={18} />
                              ドキュメントをアップロード
                            </button>
                          </div>
                        </div>
                        
                        {/* 検索設定 */}
                        <div>
                          <h4 className="font-bold text-gray-800 mb-4">🔍 検索設定</h4>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                取得チャンク数
                                <span className="ml-2 text-xs text-gray-500">一度に参照する情報の数</span>
                              </label>
                              <div className="flex items-center gap-4">
                                <input
                                  type="range"
                                  value={config.knowledge_base.retrieval_chunks}
                                  onChange={(e) => setConfig({...config, knowledge_base: {...config.knowledge_base, retrieval_chunks: parseInt(e.target.value)}})}
                                  className="flex-1"
                                  min="1"
                                  max="10"
                                  step="1"
                                />
                                <span className="text-sm font-medium bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                                  {config.knowledge_base.retrieval_chunks} チャンク
                                </span>
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                類似度しきい値
                                <span className="ml-2 text-xs text-gray-500">関連性の判定基準</span>
                              </label>
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-500">低い</span>
                                <input
                                  type="range"
                                  value={config.knowledge_base.similarity_threshold}
                                  onChange={(e) => setConfig({...config, knowledge_base: {...config.knowledge_base, similarity_threshold: parseFloat(e.target.value)}})}
                                  className="flex-1"
                                  min="0"
                                  max="1"
                                  step="0.1"
                                />
                                <span className="text-sm text-gray-500">高い</span>
                                <span className="ml-2 text-sm font-medium bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                                  {config.knowledge_base.similarity_threshold}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* 会話設定 */}
            {activeSection === "conversation" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl">
                      <MessageSquare size={24} className="text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">会話設定</h3>
                      <p className="text-gray-500">自然な会話を実現する詳細設定</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* 応答速度 */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">応答速度の調整</h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          応答の速さ
                          <span className="ml-2 text-xs text-gray-500">ユーザーの話が終わってから返答するまでの時間</span>
                        </label>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500 w-20">ゆっくり</span>
                          <input
                            type="range"
                            value={config.conversation.responsiveness}
                            onChange={(e) => setConfig({...config, conversation: {...config.conversation, responsiveness: parseFloat(e.target.value)}})}
                            className="flex-1"
                            min="0"
                            max="1"
                            step="0.1"
                          />
                          <span className="text-sm text-gray-500 w-20 text-right">すばやく</span>
                          <span className="ml-2 text-sm font-medium bg-green-100 text-green-700 px-3 py-1 rounded-full">
                            {config.conversation.responsiveness}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* 割り込み設定 */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">割り込み設定</h4>
                      <div className="space-y-4">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.conversation.allow_interruption}
                            onChange={(e) => setConfig({...config, conversation: {...config.conversation, allow_interruption: e.target.checked}})}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <div>
                            <p className="font-medium text-gray-800">割り込みを許可</p>
                            <p className="text-xs text-gray-500">ユーザーがAIの話を遮ることができます</p>
                          </div>
                        </label>
                        
                        {config.conversation.allow_interruption && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              割り込み感度
                            </label>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-500 w-20">鈍感</span>
                              <input
                                type="range"
                                value={config.conversation.interruption_sensitivity}
                                onChange={(e) => setConfig({...config, conversation: {...config.conversation, interruption_sensitivity: parseFloat(e.target.value)}})}
                                className="flex-1"
                                min="0"
                                max="1"
                                step="0.1"
                              />
                              <span className="text-sm text-gray-500 w-20 text-right">敏感</span>
                              <span className="ml-2 text-sm font-medium bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                                {config.conversation.interruption_sensitivity}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* 相づち設定 */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">相づち設定</h4>
                      <div className="space-y-4">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.conversation.enable_backchanneling}
                            onChange={(e) => setConfig({...config, conversation: {...config.conversation, enable_backchanneling: e.target.checked}})}
                            className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                          />
                          <div>
                            <p className="font-medium text-gray-800">相づちを有効化</p>
                            <p className="text-xs text-gray-500">「はい」「ええ」などの相づちを打ちます</p>
                          </div>
                        </label>
                        
                        {config.conversation.enable_backchanneling && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                相づちの頻度
                              </label>
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-500 w-20">少ない</span>
                                <input
                                  type="range"
                                  value={config.conversation.backchannel_frequency}
                                  onChange={(e) => setConfig({...config, conversation: {...config.conversation, backchannel_frequency: parseFloat(e.target.value)}})}
                                  className="flex-1"
                                  min="0"
                                  max="1"
                                  step="0.1"
                                />
                                <span className="text-sm text-gray-500 w-20 text-right">多い</span>
                                <span className="ml-2 text-sm font-medium bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                                  {config.conversation.backchannel_frequency}
                                </span>
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                相づちの言葉
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {config.conversation.backchannel_words.map((word, i) => (
                                  <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-2">
                                    {word}
                                    <button
                                      onClick={() => {
                                        const words = config.conversation.backchannel_words.filter((_, idx) => idx !== i);
                                        setConfig({...config, conversation: {...config.conversation, backchannel_words: words}});
                                      }}
                                      className="hover:text-purple-900"
                                    >
                                      <X size={14} />
                                    </button>
                                  </span>
                                ))}
                                <button className="px-3 py-1 border-2 border-dashed border-purple-300 text-purple-600 rounded-full text-sm hover:bg-purple-50">
                                  + 追加
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* リマインダー設定 */}
                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">リマインダー設定</h4>
                      <div className="space-y-4">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.conversation.reminder_enabled}
                            onChange={(e) => setConfig({...config, conversation: {...config.conversation, reminder_enabled: e.target.checked}})}
                            className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                          />
                          <div>
                            <p className="font-medium text-gray-800">リマインダーを有効化</p>
                            <p className="text-xs text-gray-500">無音が続いた時に確認メッセージを送ります</p>
                          </div>
                        </label>
                        
                        {config.conversation.reminder_enabled && (
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                送信間隔
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={config.conversation.reminder_interval}
                                  onChange={(e) => setConfig({...config, conversation: {...config.conversation, reminder_interval: parseInt(e.target.value)}})}
                                  className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg"
                                  min="5"
                                  max="60"
                                />
                                <span className="text-sm text-gray-600">秒</span>
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                最大回数
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={config.conversation.reminder_max_count}
                                  onChange={(e) => setConfig({...config, conversation: {...config.conversation, reminder_max_count: parseInt(e.target.value)}})}
                                  className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg"
                                  min="1"
                                  max="10"
                                />
                                <span className="text-sm text-gray-600">回</span>
                              </div>
                            </div>
                            
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                リマインダーメッセージ
                              </label>
                              <input
                                type="text"
                                value={config.conversation.reminder_message}
                                onChange={(e) => setConfig({...config, conversation: {...config.conversation, reminder_message: e.target.value}})}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
                                placeholder="例: お客様、まだいらっしゃいますか？"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 音声設定 */}
            {activeSection === "speech" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-pink-100 to-rose-100 rounded-xl">
                      <Volume2 size={24} className="text-pink-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">音声設定</h3>
                      <p className="text-gray-500">音声の品質と処理に関する設定</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* 背景音設定 */}
                    <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">🎵 背景音設定</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            背景音の種類
                          </label>
                          <select
                            value={config.speech.background_sound}
                            onChange={(e) => setConfig({...config, speech: {...config.speech, background_sound: e.target.value}})}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          >
                            <option value="none">なし</option>
                            <option value="office">オフィス環境</option>
                            <option value="cafe">カフェ</option>
                            <option value="white_noise">ホワイトノイズ</option>
                          </select>
                        </div>
                        
                        {config.speech.background_sound !== "none" && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              背景音の音量
                            </label>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-500">小さい</span>
                              <input
                                type="range"
                                value={config.speech.background_volume}
                                onChange={(e) => setConfig({...config, speech: {...config.speech, background_volume: parseFloat(e.target.value)}})}
                                className="flex-1"
                                min="0"
                                max="1"
                                step="0.1"
                              />
                              <span className="text-sm text-gray-500">大きい</span>
                              <span className="ml-2 text-sm font-medium bg-pink-100 text-pink-700 px-3 py-1 rounded-full">
                                {Math.round(config.speech.background_volume * 100)}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* 音声処理 */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">🎙️ 音声処理</h4>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.speech.noise_reduction}
                            onChange={(e) => setConfig({...config, speech: {...config.speech, noise_reduction: e.target.checked}})}
                            className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                          />
                          <div>
                            <p className="font-medium text-gray-800">ノイズ除去</p>
                            <p className="text-xs text-gray-500">背景ノイズを自動的に除去します</p>
                          </div>
                        </label>
                        
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.speech.echo_cancellation}
                            onChange={(e) => setConfig({...config, speech: {...config.speech, echo_cancellation: e.target.checked}})}
                            className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                          />
                          <div>
                            <p className="font-medium text-gray-800">エコーキャンセレーション</p>
                            <p className="text-xs text-gray-500">反響音を除去して聞き取りやすくします</p>
                          </div>
                        </label>
                        
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.speech.auto_gain_control}
                            onChange={(e) => setConfig({...config, speech: {...config.speech, auto_gain_control: e.target.checked}})}
                            className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                          />
                          <div>
                            <p className="font-medium text-gray-800">自動ゲイン制御</p>
                            <p className="text-xs text-gray-500">音量を自動的に調整します</p>
                          </div>
                        </label>
                      </div>
                    </div>
                    
                    {/* 音声正規化 */}
                    <div className="bg-gradient-to-r from-rose-50 to-orange-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">📝 音声正規化</h4>
                      <div className="space-y-4">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.speech.enable_normalization}
                            onChange={(e) => setConfig({...config, speech: {...config.speech, enable_normalization: e.target.checked}})}
                            className="w-5 h-5 text-rose-600 rounded focus:ring-2 focus:ring-rose-500"
                          />
                          <div>
                            <p className="font-medium text-gray-800">正規化を有効化</p>
                            <p className="text-xs text-gray-500">数字や日付を適切な形式で読み上げます</p>
                          </div>
                        </label>
                        
                        {config.speech.enable_normalization && (
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                数字の読み方
                              </label>
                              <select
                                value={config.speech.number_format}
                                onChange={(e) => setConfig({...config, speech: {...config.speech, number_format: e.target.value}})}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
                              >
                                <option value="japanese">日本語</option>
                                <option value="english">英語</option>
                                <option value="mixed">混合</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                日付の読み方
                              </label>
                              <select
                                value={config.speech.date_format}
                                onChange={(e) => setConfig({...config, speech: {...config.speech, date_format: e.target.value}})}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
                              >
                                <option value="japanese">日本語（令和）</option>
                                <option value="western">西暦</option>
                                <option value="both">両方</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 文字起こし設定 */}
            {activeSection === "transcription" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl">
                      <Mic size={24} className="text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">文字起こし設定</h3>
                      <p className="text-gray-500">音声認識の精度と処理に関する設定</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* プロバイダー選択 */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">🤖 音声認識エンジン</h4>
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              プロバイダー
                            </label>
                            <select
                              value={config.transcription.provider}
                              onChange={(e) => setConfig({...config, transcription: {...config.transcription, provider: e.target.value}})}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
                            >
                              <option value="whisper">OpenAI Whisper</option>
                              <option value="google">Google Speech-to-Text</option>
                              <option value="azure">Azure Speech Services</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              モデル
                            </label>
                            <select
                              value={config.transcription.model}
                              onChange={(e) => setConfig({...config, transcription: {...config.transcription, model: e.target.value}})}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
                            >
                              <option value="large-v2">Large-v2（最高精度）</option>
                              <option value="medium">Medium（バランス）</option>
                              <option value="small">Small（高速）</option>
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            認識言語
                          </label>
                          <select
                            value={config.transcription.language}
                            onChange={(e) => setConfig({...config, transcription: {...config.transcription, language: e.target.value}})}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
                          >
                            <option value="ja">日本語</option>
                            <option value="en">English</option>
                            <option value="auto">自動検出</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    {/* ノイズ処理 */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">🔊 ノイズ処理</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ノイズ除去モード
                          </label>
                          <select
                            value={config.transcription.denoising_mode}
                            onChange={(e) => setConfig({...config, transcription: {...config.transcription, denoising_mode: e.target.value}})}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
                          >
                            <option value="off">オフ</option>
                            <option value="moderate">標準</option>
                            <option value="aggressive">強力</option>
                          </select>
                        </div>
                        
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.transcription.remove_background_speech}
                            onChange={(e) => setConfig({...config, transcription: {...config.transcription, remove_background_speech: e.target.checked}})}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <div>
                            <p className="font-medium text-gray-800">背景音声を除去</p>
                            <p className="text-xs text-gray-500">周囲の会話を除外します</p>
                          </div>
                        </label>
                      </div>
                    </div>
                    
                    {/* 最適化とキーワード */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">⚡ 最適化設定</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            最適化モード
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            {['speed', 'balanced', 'accuracy'].map((mode) => (
                              <button
                                key={mode}
                                onClick={() => setConfig({...config, transcription: {...config.transcription, optimization: mode}})}
                                className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                                  config.transcription.optimization === mode
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {mode === 'speed' && '速度優先'}
                                {mode === 'balanced' && 'バランス'}
                                {mode === 'accuracy' && '精度優先'}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            強調キーワード
                            <span className="ml-2 text-xs text-gray-500">認識精度を向上させたい単語</span>
                          </label>
                          <textarea
                            value={config.transcription.boosted_keywords}
                            onChange={(e) => setConfig({...config, transcription: {...config.transcription, boosted_keywords: e.target.value}})}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
                            rows={3}
                            placeholder="カンマ区切りでキーワードを入力"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={config.transcription.profanity_filter}
                              onChange={(e) => setConfig({...config, transcription: {...config.transcription, profanity_filter: e.target.checked}})}
                              className="w-5 h-5 text-purple-600 rounded"
                            />
                            <div>
                              <p className="font-medium text-gray-800">不適切な言葉をフィルター</p>
                              <p className="text-xs text-gray-500">***で置き換えます</p>
                            </div>
                          </label>
                          
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={config.transcription.remove_fillers}
                              onChange={(e) => setConfig({...config, transcription: {...config.transcription, remove_fillers: e.target.checked}})}
                              className="w-5 h-5 text-purple-600 rounded"
                            />
                            <div>
                              <p className="font-medium text-gray-800">フィラーを除去</p>
                              <p className="text-xs text-gray-500">「えー」「あの」を除去</p>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 通話設定 */}
            {activeSection === "call" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-red-100 to-orange-100 rounded-xl">
                      <Phone size={24} className="text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">通話設定</h3>
                      <p className="text-gray-500">通話の制御と検出に関する設定</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* 基本設定 */}
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">⏱️ 通話時間設定</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            最大通話時間
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={config.call.max_duration / 60}
                              onChange={(e) => setConfig({...config, call: {...config.call, max_duration: parseInt(e.target.value) * 60}})}
                              className="w-24 px-3 py-2 border-2 border-gray-200 rounded-lg"
                              min="1"
                              max="120"
                            />
                            <span className="text-sm text-gray-600">分</span>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            終了前の警告
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={config.call.warning_before_end}
                              onChange={(e) => setConfig({...config, call: {...config.call, warning_before_end: parseInt(e.target.value)}})}
                              className="w-24 px-3 py-2 border-2 border-gray-200 rounded-lg"
                              min="10"
                              max="300"
                            />
                            <span className="text-sm text-gray-600">秒前</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 無音検出 */}
                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">🔇 無音検出</h4>
                      <div className="space-y-4">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.call.silence_detection}
                            onChange={(e) => setConfig({...config, call: {...config.call, silence_detection: e.target.checked}})}
                            className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                          />
                          <div>
                            <p className="font-medium text-gray-800">無音検出を有効化</p>
                            <p className="text-xs text-gray-500">長時間の無音で自動切断します</p>
                          </div>
                        </label>
                        
                        {config.call.silence_detection && (
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                無音タイムアウト
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={config.call.silence_timeout}
                                  onChange={(e) => setConfig({...config, call: {...config.call, silence_timeout: parseInt(e.target.value)}})}
                                  className="w-24 px-3 py-2 border-2 border-gray-200 rounded-lg"
                                  min="30"
                                  max="600"
                                />
                                <span className="text-sm text-gray-600">秒</span>
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                無音しきい値
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={config.call.silence_threshold}
                                  onChange={(e) => setConfig({...config, call: {...config.call, silence_threshold: parseInt(e.target.value)}})}
                                  className="w-24 px-3 py-2 border-2 border-gray-200 rounded-lg"
                                  min="-60"
                                  max="0"
                                />
                                <span className="text-sm text-gray-600">dB</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* 自動検出 */}
                    <div className="bg-gradient-to-r from-yellow-50 to-green-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">🤖 自動検出機能</h4>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.call.voicemail_detection}
                            onChange={(e) => setConfig({...config, call: {...config.call, voicemail_detection: e.target.checked}})}
                            className="w-5 h-5 text-green-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-800">留守電検出</p>
                            <p className="text-xs text-gray-500">留守番電話を自動判定します</p>
                          </div>
                        </label>
                        
                        {config.call.voicemail_detection && (
                          <div className="ml-8 mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              留守電時の動作
                            </label>
                            <select
                              value={config.call.voicemail_action}
                              onChange={(e) => setConfig({...config, call: {...config.call, voicemail_action: e.target.value}})}
                              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
                            >
                              <option value="leave_message">メッセージを残す</option>
                              <option value="hangup">切断する</option>
                              <option value="callback">コールバック登録</option>
                            </select>
                          </div>
                        )}
                        
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.call.ivr_detection}
                            onChange={(e) => setConfig({...config, call: {...config.call, ivr_detection: e.target.checked}})}
                            className="w-5 h-5 text-green-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-800">IVR検出</p>
                            <p className="text-xs text-gray-500">自動音声応答を検出します</p>
                          </div>
                        </label>
                        
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.call.keypad_detection}
                            onChange={(e) => setConfig({...config, call: {...config.call, keypad_detection: e.target.checked}})}
                            className="w-5 h-5 text-green-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-800">キーパッド入力検出</p>
                            <p className="text-xs text-gray-500">DTMFトーンを認識します</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 分析設定 */}
            {activeSection === "analytics" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl">
                      <Brain size={24} className="text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">分析設定</h3>
                      <p className="text-gray-500">会話の分析と評価に関する設定</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* リアルタイム分析 */}
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">⚡ リアルタイム分析</h4>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.analytics.sentiment_analysis}
                            onChange={(e) => setConfig({...config, analytics: {...config.analytics, sentiment_analysis: e.target.checked}})}
                            className="w-5 h-5 text-purple-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-800">感情分析</p>
                            <p className="text-xs text-gray-500">発話者の感情を分析します</p>
                          </div>
                          <span className="ml-auto px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                            ポジティブ/ネガティブ/中立
                          </span>
                        </label>
                        
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.analytics.emotion_detection}
                            onChange={(e) => setConfig({...config, analytics: {...config.analytics, emotion_detection: e.target.checked}})}
                            className="w-5 h-5 text-purple-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-800">感情検出</p>
                            <p className="text-xs text-gray-500">喜び、怒り、悲しみなどを検出</p>
                          </div>
                          <span className="ml-auto px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                            8種類の感情
                          </span>
                        </label>
                        
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.analytics.intent_classification}
                            onChange={(e) => setConfig({...config, analytics: {...config.analytics, intent_classification: e.target.checked}})}
                            className="w-5 h-5 text-purple-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-800">意図分類</p>
                            <p className="text-xs text-gray-500">顧客の意図を自動分類</p>
                          </div>
                          <span className="ml-auto px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                            問い合わせ/苦情/予約など
                          </span>
                        </label>
                      </div>
                    </div>
                    
                    {/* 後処理分析 */}
                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">📊 後処理分析</h4>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.analytics.call_summary}
                            onChange={(e) => setConfig({...config, analytics: {...config.analytics, call_summary: e.target.checked}})}
                            className="w-5 h-5 text-indigo-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-800">通話要約</p>
                            <p className="text-xs text-gray-500">会話内容を自動要約</p>
                          </div>
                        </label>
                        
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.analytics.action_items}
                            onChange={(e) => setConfig({...config, analytics: {...config.analytics, action_items: e.target.checked}})}
                            className="w-5 h-5 text-indigo-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-800">アクションアイテム抽出</p>
                            <p className="text-xs text-gray-500">対応が必要な項目を抽出</p>
                          </div>
                        </label>
                        
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.analytics.follow_up_required}
                            onChange={(e) => setConfig({...config, analytics: {...config.analytics, follow_up_required: e.target.checked}})}
                            className="w-5 h-5 text-indigo-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-800">フォローアップ判定</p>
                            <p className="text-xs text-gray-500">追加対応の必要性を判定</p>
                          </div>
                        </label>
                      </div>
                    </div>
                    
                    {/* 品質評価 */}
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">⭐ 品質評価</h4>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.analytics.call_quality_score}
                            onChange={(e) => setConfig({...config, analytics: {...config.analytics, call_quality_score: e.target.checked}})}
                            className="w-5 h-5 text-blue-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-800">通話品質スコア</p>
                            <p className="text-xs text-gray-500">音質や応答速度を評価</p>
                          </div>
                          <span className="ml-auto px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            0-100点
                          </span>
                        </label>
                        
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.analytics.agent_performance}
                            onChange={(e) => setConfig({...config, analytics: {...config.analytics, agent_performance: e.target.checked}})}
                            className="w-5 h-5 text-blue-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-800">エージェント評価</p>
                            <p className="text-xs text-gray-500">AIの対応品質を評価</p>
                          </div>
                        </label>
                        
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.analytics.customer_satisfaction}
                            onChange={(e) => setConfig({...config, analytics: {...config.analytics, customer_satisfaction: e.target.checked}})}
                            className="w-5 h-5 text-blue-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-800">顧客満足度推定</p>
                            <p className="text-xs text-gray-500">会話から満足度を推測</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* セキュリティ設定 */}
            {activeSection === "security" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-gray-100 to-slate-100 rounded-xl">
                      <Shield size={24} className="text-gray-700" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">セキュリティ設定</h3>
                      <p className="text-gray-500">データ保護とプライバシーの設定</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* データ保存 */}
                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">💾 データ保存設定</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            データ保存期間
                          </label>
                          <select
                            value={config.security.data_retention}
                            onChange={(e) => setConfig({...config, security: {...config.security, data_retention: e.target.value}})}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
                          >
                            <option value="7days">7日間</option>
                            <option value="30days">30日間</option>
                            <option value="90days">90日間</option>
                            <option value="1year">1年間</option>
                            <option value="forever">無期限</option>
                          </select>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={config.security.recording_enabled}
                              onChange={(e) => setConfig({...config, security: {...config.security, recording_enabled: e.target.checked}})}
                              className="w-5 h-5 text-gray-600 rounded"
                            />
                            <div>
                              <p className="font-medium text-gray-800">通話録音</p>
                              <p className="text-xs text-gray-500">音声データを保存</p>
                            </div>
                          </label>
                          
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={config.security.transcript_enabled}
                              onChange={(e) => setConfig({...config, security: {...config.security, transcript_enabled: e.target.checked}})}
                              className="w-5 h-5 text-gray-600 rounded"
                            />
                            <div>
                              <p className="font-medium text-gray-800">文字起こし保存</p>
                              <p className="text-xs text-gray-500">テキストデータを保存</p>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    {/* 個人情報保護 */}
                    <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">🔒 個人情報保護</h4>
                      <div className="space-y-4">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.security.pii_redaction}
                            onChange={(e) => setConfig({...config, security: {...config.security, pii_redaction: e.target.checked}})}
                            className="w-5 h-5 text-slate-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-800">PII自動マスキング</p>
                            <p className="text-xs text-gray-500">個人情報を自動的に隠します</p>
                          </div>
                        </label>
                        
                        {config.security.pii_redaction && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">マスキング対象</p>
                            <div className="flex flex-wrap gap-2">
                              {['name', 'phone', 'email', 'address', 'credit_card'].map((category) => (
                                <label key={category} className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                                  <input
                                    type="checkbox"
                                    checked={config.security.pii_categories.includes(category)}
                                    onChange={(e) => {
                                      const categories = e.target.checked 
                                        ? [...config.security.pii_categories, category]
                                        : config.security.pii_categories.filter((c: string) => c !== category);
                                      setConfig({...config, security: {...config.security, pii_categories: categories}});
                                    }}
                                    className="w-4 h-4 text-slate-600 rounded"
                                  />
                                  <span className="text-sm">
                                    {category === 'name' && '氏名'}
                                    {category === 'phone' && '電話番号'}
                                    {category === 'email' && 'メール'}
                                    {category === 'address' && '住所'}
                                    {category === 'credit_card' && 'カード情報'}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* 暗号化 */}
                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">🔐 暗号化設定</h4>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.security.encryption_at_rest}
                            onChange={(e) => setConfig({...config, security: {...config.security, encryption_at_rest: e.target.checked}})}
                            className="w-5 h-5 text-gray-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-800">保存データの暗号化</p>
                            <p className="text-xs text-gray-500">AES-256で暗号化</p>
                          </div>
                        </label>
                        
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.security.encryption_in_transit}
                            onChange={(e) => setConfig({...config, security: {...config.security, encryption_in_transit: e.target.checked}})}
                            className="w-5 h-5 text-gray-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-800">通信の暗号化</p>
                            <p className="text-xs text-gray-500">TLS 1.3</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 通知設定 */}
            {activeSection === "notifications" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-orange-100 to-red-100 rounded-xl">
                      <Bell size={24} className="text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">通知設定</h3>
                      <p className="text-gray-500">外部サービスへの通知連携</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Webhook設定 */}
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">🔗 Webhook設定</h4>
                      <div className="space-y-4">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.notifications.webhook_enabled}
                            onChange={(e) => setConfig({...config, notifications: {...config.notifications, webhook_enabled: e.target.checked}})}
                            className="w-5 h-5 text-orange-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-800">Webhookを有効化</p>
                            <p className="text-xs text-gray-500">イベントをHTTPで通知</p>
                          </div>
                        </label>
                        
                        {config.notifications.webhook_enabled && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Webhook URL
                              </label>
                              <input
                                type="url"
                                value={config.notifications.webhook_url}
                                onChange={(e) => setConfig({...config, notifications: {...config.notifications, webhook_url: e.target.value}})}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
                                placeholder="https://example.com/webhook"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                通知イベント
                              </label>
                              <div className="grid grid-cols-2 gap-3">
                                {['call_started', 'call_ended', 'error', 'transfer'].map((event) => (
                                  <label key={event} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={config.notifications.webhook_events.includes(event)}
                                      onChange={(e) => {
                                        const events = e.target.checked
                                          ? [...config.notifications.webhook_events, event]
                                          : config.notifications.webhook_events.filter((e: string) => e !== event);
                                        setConfig({...config, notifications: {...config.notifications, webhook_events: events}});
                                      }}
                                      className="w-4 h-4 text-orange-600 rounded"
                                    />
                                    <span className="text-sm">
                                      {event === 'call_started' && '通話開始'}
                                      {event === 'call_ended' && '通話終了'}
                                      {event === 'error' && 'エラー'}
                                      {event === 'transfer' && '転送'}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Slack通知 */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">💬 Slack通知</h4>
                      <div className="space-y-4">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.notifications.slack_enabled}
                            onChange={(e) => setConfig({...config, notifications: {...config.notifications, slack_enabled: e.target.checked}})}
                            className="w-5 h-5 text-purple-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-800">Slack通知を有効化</p>
                            <p className="text-xs text-gray-500">重要なイベントをSlackに送信</p>
                          </div>
                        </label>
                        
                        {config.notifications.slack_enabled && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Slack Webhook URL
                            </label>
                            <input
                              type="url"
                              value={config.notifications.slack_webhook}
                              onChange={(e) => setConfig({...config, notifications: {...config.notifications, slack_webhook: e.target.value}})}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
                              placeholder="https://hooks.slack.com/services/..."
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* LINE通知 */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4">📱 LINE通知</h4>
                      <div className="space-y-4">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={config.notifications.line_enabled}
                            onChange={(e) => setConfig({...config, notifications: {...config.notifications, line_enabled: e.target.checked}})}
                            className="w-5 h-5 text-green-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-800">LINE通知を有効化</p>
                            <p className="text-xs text-gray-500">LINE Notifyで通知</p>
                          </div>
                        </label>
                        
                        {config.notifications.line_enabled && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              LINE Notify トークン
                            </label>
                            <input
                              type="password"
                              value={config.notifications.line_token}
                              onChange={(e) => setConfig({...config, notifications: {...config.notifications, line_token: e.target.value}})}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
                              placeholder="Bearer token..."
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          )}
          
          {/* 保存ボタン */}
          <div className="sticky bottom-0 bg-white border-t px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Check size={16} className="text-green-500" />
                <span>自動保存: 有効</span>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={onClose}
                  className="px-6 py-2 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                >
                  キャンセル
                </button>
                <button className="px-6 py-2 border-2 border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 font-medium transition-colors flex items-center gap-2">
                  <TestTube size={18} />
                  テスト通話
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-8 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      設定を保存
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}