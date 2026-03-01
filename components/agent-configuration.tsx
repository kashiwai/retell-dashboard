'use client';

import { useState, useEffect } from "react";
import { 
  Settings, Plus, X, ChevronRight, ChevronDown, Info, Save, 
  Phone, MessageSquare, Brain, Volume2, Mic, Clock, Shield,
  Globe, Database, Webhook, AlertCircle, Check, Copy, TestTube,
  Zap, Calendar, PhoneOff, Key, Timer, Archive, Link, Variable
} from "lucide-react";

interface AgentConfigProps {
  agentId: string;
  onClose: () => void;
  onSave: (config: any) => void;
}

export default function AgentConfiguration({ agentId, onClose, onSave }: AgentConfigProps) {
  const [activeSection, setActiveSection] = useState("general");
  const [config, setConfig] = useState({
    // General Settings
    name: "",
    voice_id: "",
    language: "ja",
    
    // Functions
    functions: {
      end_call: false,
      calendar_booking: false,
      custom_functions: []
    },
    
    // Knowledge Base
    knowledge_base: {
      enabled: false,
      documents: [],
      retrieval_chunks: 3,
      similarity_threshold: 0.7
    },
    
    // Speech Settings
    speech: {
      background_sound: "none",
      responsiveness: 0.8,
      interruption_sensitivity: 0.6,
      enable_backchanneling: true,
      backchannel_frequency: 0.8,
      backchannel_words: "はい,ええ,なるほど,そうですね",
      enable_speech_normalization: true,
      reminder_frequency: 15,
      reminder_max_count: 2,
      pronunciation_guide: []
    },
    
    // Transcription Settings
    transcription: {
      denoising_mode: "remove_noise",
      transcription_mode: "speed",
      boosted_keywords: ""
    },
    
    // Call Settings
    call: {
      voicemail_detection: false,
      ivr_hangup: false,
      keypad_detection: false,
      keypad_timeout: 2.5,
      termination_key: "#",
      digit_limit: null,
      end_call_on_silence: 180,
      max_duration: 3600,
      ring_duration: 30
    },
    
    // Post-call Settings
    post_call: {
      data_extraction: ["call_summary", "call_successful", "user_sentiment"],
      custom_extraction: []
    },
    
    // Security Settings
    security: {
      data_storage: "everything",
      retention: "forever",
      pii_redaction: false,
      safety_guardrails: [],
      secure_urls: false,
      fallback_voice: "automatic"
    },
    
    // Webhook Settings
    webhook: {
      url: "",
      timeout: 5,
      events: ["call_started", "call_ended", "transcript", "analysis"]
    },
    
    // MCP Settings
    mcp: {
      enabled: false,
      tools: []
    }
  });
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["general"]));
  
  // Load agent configuration
  useEffect(() => {
    fetchAgentConfig();
  }, [agentId]);
  
  const fetchAgentConfig = async () => {
    try {
      const res = await fetch(`/api/agent-config?agent_id=${agentId}`);
      if (res.ok) {
        const data = await res.json();
        setConfig(prevConfig => ({ ...prevConfig, ...data }));
      }
    } catch (error) {
      console.error("Failed to fetch agent config:", error);
    }
  };
  
  const handleSave = async () => {
    try {
      const res = await fetch(`/api/agent-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId, config })
      });
      if (res.ok) {
        onSave(config);
        alert("設定を保存しました");
      }
    } catch (error) {
      console.error("Failed to save config:", error);
      alert("設定の保存に失敗しました");
    }
  };
  
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };
  
  const sections = [
    { id: "general", label: "基本情報", icon: Settings },
    { id: "functions", label: "Functions", icon: Zap },
    { id: "knowledge", label: "Knowledge Base", icon: Database },
    { id: "speech", label: "Speech Settings", icon: Volume2 },
    { id: "transcription", label: "Transcription", icon: Mic },
    { id: "call", label: "Call Settings", icon: Phone },
    { id: "postcall", label: "Post-Call Data", icon: Archive },
    { id: "security", label: "Security & Fallback", icon: Shield },
    { id: "webhook", label: "Webhook Settings", icon: Webhook },
    { id: "mcp", label: "MCPs", icon: Brain }
  ];
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex z-50">
      <div className="flex-1 bg-white overflow-hidden flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 border-r">
          <div className="p-4 border-b bg-white">
            <h2 className="font-bold text-lg">エージェント設定</h2>
            <p className="text-sm text-gray-500 mt-1">Agent ID: {agentId}</p>
          </div>
          <nav className="p-2">
            {sections.map(section => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                    activeSection === section.id
                      ? "bg-blue-50 text-blue-600 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Icon size={18} />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* General Settings */}
            {activeSection === "general" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">基本情報</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">エージェント名</label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) => setConfig({...config, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">音声ID</label>
                  <input
                    type="text"
                    value={config.voice_id}
                    onChange={(e) => setConfig({...config, voice_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">言語</label>
                  <select
                    value={config.language}
                    onChange={(e) => setConfig({...config, language: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                    <option value="zh">中文</option>
                  </select>
                </div>
              </div>
            )}
            
            {/* Functions */}
            {activeSection === "functions" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold mb-2">Functions</h3>
                  <p className="text-sm text-gray-500">Enable your agent with capabilities such as calendar bookings, call termination, etc.</p>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={config.functions.end_call}
                      onChange={(e) => setConfig({...config, functions: {...config.functions, end_call: e.target.checked}})}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <p className="font-medium">end_call</p>
                      <p className="text-sm text-gray-500">Allow agent to end the call</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={config.functions.calendar_booking}
                      onChange={(e) => setConfig({...config, functions: {...config.functions, calendar_booking: e.target.checked}})}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <p className="font-medium">calendar_booking</p>
                      <p className="text-sm text-gray-500">Enable calendar booking functionality</p>
                    </div>
                  </label>
                </div>
                <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">
                  + Add Custom Function
                </button>
              </div>
            )}
            
            {/* Knowledge Base */}
            {activeSection === "knowledge" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold mb-2">Knowledge Base</h3>
                  <p className="text-sm text-gray-500">Add knowledge base to provide context to the agent.</p>
                </div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config.knowledge_base.enabled}
                    onChange={(e) => setConfig({...config, knowledge_base: {...config.knowledge_base, enabled: e.target.checked}})}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="font-medium">Enable Knowledge Base</span>
                </label>
                {config.knowledge_base.enabled && (
                  <div className="space-y-3 pl-7">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Retrieval Chunks
                        <Info size={14} className="inline ml-1 text-gray-400" />
                      </label>
                      <input
                        type="number"
                        value={config.knowledge_base.retrieval_chunks}
                        onChange={(e) => setConfig({...config, knowledge_base: {...config.knowledge_base, retrieval_chunks: parseInt(e.target.value)}})}
                        className="w-32 px-3 py-2 border rounded-lg"
                        min="1"
                        max="10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Similarity Threshold
                      </label>
                      <input
                        type="range"
                        value={config.knowledge_base.similarity_threshold}
                        onChange={(e) => setConfig({...config, knowledge_base: {...config.knowledge_base, similarity_threshold: parseFloat(e.target.value)}})}
                        className="w-full"
                        min="0"
                        max="1"
                        step="0.1"
                      />
                      <span className="text-sm text-gray-500">{config.knowledge_base.similarity_threshold}</span>
                    </div>
                  </div>
                )}
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  + Add Document
                </button>
              </div>
            )}
            
            {/* Speech Settings */}
            {activeSection === "speech" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Speech Settings</h3>
                
                {/* Background Sound */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Background Sound</label>
                  <select
                    value={config.speech.background_sound}
                    onChange={(e) => setConfig({...config, speech: {...config.speech, background_sound: e.target.value}})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="none">None</option>
                    <option value="office">Office</option>
                    <option value="cafe">Cafe</option>
                  </select>
                </div>
                
                {/* Responsiveness */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responsiveness
                    <span className="text-xs text-gray-500 ml-2">Control how fast the agent responds</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">slow</span>
                    <input
                      type="range"
                      value={config.speech.responsiveness}
                      onChange={(e) => setConfig({...config, speech: {...config.speech, responsiveness: parseFloat(e.target.value)}})}
                      className="flex-1"
                      min="0"
                      max="1"
                      step="0.1"
                    />
                    <span className="text-sm text-gray-500">fast</span>
                    <span className="ml-2 text-sm font-medium">{config.speech.responsiveness}</span>
                  </div>
                </div>
                
                {/* Interruption Sensitivity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interruption Sensitivity
                    <span className="text-xs text-gray-500 ml-2">Control how sensitively AI can be interrupted</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">low</span>
                    <input
                      type="range"
                      value={config.speech.interruption_sensitivity}
                      onChange={(e) => setConfig({...config, speech: {...config.speech, interruption_sensitivity: parseFloat(e.target.value)}})}
                      className="flex-1"
                      min="0"
                      max="1"
                      step="0.1"
                    />
                    <span className="text-sm text-gray-500">high</span>
                    <span className="ml-2 text-sm font-medium">{config.speech.interruption_sensitivity}</span>
                  </div>
                </div>
                
                {/* Backchanneling */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={config.speech.enable_backchanneling}
                      onChange={(e) => setConfig({...config, speech: {...config.speech, enable_backchanneling: e.target.checked}})}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <p className="font-medium">Enable Backchanneling</p>
                      <p className="text-xs text-gray-500">Enables affirmations like "はい" or "ええ" during conversations</p>
                    </div>
                  </label>
                  
                  {config.speech.enable_backchanneling && (
                    <div className="pl-7 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Backchannel Frequency</label>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500">low</span>
                          <input
                            type="range"
                            value={config.speech.backchannel_frequency}
                            onChange={(e) => setConfig({...config, speech: {...config.speech, backchannel_frequency: parseFloat(e.target.value)}})}
                            className="flex-1"
                            min="0"
                            max="1"
                            step="0.1"
                          />
                          <span className="text-sm text-gray-500">high</span>
                          <span className="ml-2 text-sm font-medium">{config.speech.backchannel_frequency}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Backchannel Words</label>
                        <input
                          type="text"
                          value={config.speech.backchannel_words}
                          onChange={(e) => setConfig({...config, speech: {...config.speech, backchannel_words: e.target.value}})}
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="はい,ええ,なるほど,そうですね"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Speech Normalization */}
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config.speech.enable_speech_normalization}
                    onChange={(e) => setConfig({...config, speech: {...config.speech, enable_speech_normalization: e.target.checked}})}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <p className="font-medium">Enable Speech Normalization</p>
                    <p className="text-xs text-gray-500">Converts numbers, currency, and dates into spoken forms</p>
                  </div>
                </label>
                
                {/* Reminder Message */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Reminder Message Frequency</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={config.speech.reminder_frequency}
                      onChange={(e) => setConfig({...config, speech: {...config.speech, reminder_frequency: parseInt(e.target.value)}})}
                      className="w-20 px-3 py-2 border rounded-lg"
                      min="5"
                      max="60"
                    />
                    <span className="text-sm text-gray-600">seconds</span>
                    <input
                      type="number"
                      value={config.speech.reminder_max_count}
                      onChange={(e) => setConfig({...config, speech: {...config.speech, reminder_max_count: parseInt(e.target.value)}})}
                      className="w-20 px-3 py-2 border rounded-lg"
                      min="1"
                      max="10"
                    />
                    <span className="text-sm text-gray-600">times</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Call Settings */}
            {activeSection === "call" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Call Settings</h3>
                
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config.call.voicemail_detection}
                    onChange={(e) => setConfig({...config, call: {...config.call, voicemail_detection: e.target.checked}})}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <p className="font-medium">Voicemail Detection</p>
                    <p className="text-xs text-gray-500">Hang up or leave a voicemail if detected</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config.call.ivr_hangup}
                    onChange={(e) => setConfig({...config, call: {...config.call, ivr_hangup: e.target.checked}})}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <p className="font-medium">IVR Hangup</p>
                    <p className="text-xs text-gray-500">Hang up if an IVR system is detected</p>
                  </div>
                </label>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Call on Silence</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={config.call.end_call_on_silence}
                      onChange={(e) => setConfig({...config, call: {...config.call, end_call_on_silence: parseInt(e.target.value)}})}
                      className="w-24 px-3 py-2 border rounded-lg"
                      min="30"
                      max="600"
                    />
                    <span className="text-sm text-gray-600">seconds</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Call Duration</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={config.call.max_duration / 3600}
                      onChange={(e) => setConfig({...config, call: {...config.call, max_duration: parseFloat(e.target.value) * 3600}})}
                      className="w-24 px-3 py-2 border rounded-lg"
                      min="0.1"
                      max="5"
                      step="0.1"
                    />
                    <span className="text-sm text-gray-600">hours</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ring Duration</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={config.call.ring_duration}
                      onChange={(e) => setConfig({...config, call: {...config.call, ring_duration: parseInt(e.target.value)}})}
                      className="w-24 px-3 py-2 border rounded-lg"
                      min="5"
                      max="90"
                    />
                    <span className="text-sm text-gray-600">seconds</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Webhook Settings */}
            {activeSection === "webhook" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Webhook Settings</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={config.webhook.url}
                      onChange={(e) => setConfig({...config, webhook: {...config.webhook, url: e.target.value}})}
                      className="flex-1 px-3 py-2 border rounded-lg"
                      placeholder="https://your-domain.com/webhook"
                    />
                    <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">
                      Test
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Webhook Timeout</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={config.webhook.timeout}
                      onChange={(e) => setConfig({...config, webhook: {...config.webhook, timeout: parseInt(e.target.value)}})}
                      className="w-24 px-3 py-2 border rounded-lg"
                      min="1"
                      max="30"
                    />
                    <span className="text-sm text-gray-600">seconds</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Webhook Events</label>
                  <div className="space-y-2">
                    {["call_started", "call_ended", "transcript", "analysis", "error"].map(event => (
                      <label key={event} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={config.webhook.events.includes(event)}
                          onChange={(e) => {
                            const events = e.target.checked 
                              ? [...config.webhook.events, event]
                              : config.webhook.events.filter(ev => ev !== event);
                            setConfig({...config, webhook: {...config.webhook, events}});
                          }}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">{event}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Actions Bar */}
        <div className="absolute bottom-0 left-64 right-0 bg-white border-t p-4">
          <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              キャンセル
            </button>
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">
                テスト
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Save size={16} />
                保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}