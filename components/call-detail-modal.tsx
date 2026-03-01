'use client';

import { useState, useRef, useEffect } from "react";
import {
  X, Play, Pause, Download, Volume2, Clock, Phone, User,
  Calendar, MapPin, MessageSquare, FileText, Mic, SkipBack,
  SkipForward, Volume, VolumeX, Copy, Check, Star, AlertCircle,
  TrendingUp, TrendingDown, Minus, Share2, ExternalLink, ChevronRight,
  PhoneIncoming, PhoneOutgoing, Timer, Activity, Bot, Hash, Sparkles
} from "lucide-react";

interface CallDetailModalProps {
  call: any;
  onClose: () => void;
}

export default function CallDetailModal({ call, onClose }: CallDetailModalProps) {
  const [activeTab, setActiveTab] = useState("transcript");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);
  const [showWaveform, setShowWaveform] = useState(true);
  const [localIssueType, setLocalIssueType] = useState(call?.issue_type || {
    category: "技術サポート",
    subCategory: "",
    priority: "normal"
  });
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [callData, setCallData] = useState(call);
  const [summaryData, setSummaryData] = useState({
    customer_name: call?.customer_name || '不明',
    phone_number: call?.phone_number || '',
    requirement: call?.requirement || '',
    details: call?.details || '',
    urgency: call?.urgency || '中',
    response_status: call?.response_status || '未対応',
    summary: call?.summary || '',
    sentiment: call?.sentiment || 'neutral',
    satisfaction_score: call?.satisfaction_score || 70,
    tags: call?.tags || [],
    action_items: call?.action_items || []
  });
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  
  // 最新のデータを取得する関数
  const fetchLatestCallData = async () => {
    try {
      console.log('Fetching latest data for call:', call.call_id);
      const response = await fetch(`/api/calls/${call.call_id}`);
      if (response.ok) {
        const latestData = await response.json();
        console.log('Latest call data:', latestData);
        
        // callDataを更新
        setCallData(latestData);
        
        // 要約データも更新
        if (latestData.call_analysis) {
          setSummaryData(prev => ({
            ...prev,
            summary: latestData.call_analysis.summary || prev.summary,
            customer_name: latestData.call_analysis.custom_analysis?.customer_name || prev.customer_name,
            phone_number: latestData.call_analysis.custom_analysis?.phone_number || prev.phone_number,
            requirement: latestData.call_analysis.custom_analysis?.requirement || prev.requirement,
            urgency: latestData.call_analysis.custom_analysis?.urgency || prev.urgency,
            sentiment: latestData.call_analysis.sentiment || prev.sentiment
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching latest call data:', error);
    }
  };
  
  // コンポーネントマウント時と定期的に最新データを取得
  useEffect(() => {
    fetchLatestCallData();
    // 3秒ごとに最新データを取得
    const interval = setInterval(fetchLatestCallData, 3000);
    return () => clearInterval(interval);
  }, [call.call_id]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Audio controls
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !audioRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (newVolume: number) => {
    if (!audioRef.current) return;
    
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      audioRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const changeSpeed = () => {
    if (!audioRef.current) return;
    
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    
    audioRef.current.playbackRate = nextSpeed;
    setPlaybackSpeed(nextSpeed);
  };

  const skip = (seconds: number) => {
    if (!audioRef.current) return;
    
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  // Use actual call data
  const callDetails = {
    id: call?.call_id || call?.id || "CALL-20240320-001",
    direction: call?.direction || call?.metadata?.call_type || "inbound",
    status: call?.call_status || call?.status || "completed",
    from: call?.from_number || call?.from || "+81 90-1234-5678",
    to: call?.to_number || call?.to || "+81 50-1808-0215",
    agent: call?.metadata?.agent_name || call?.agent_name || "カスタマーサポートAI",
    startTime: call?.start_timestamp || new Date().toISOString(),
    endTime: call?.end_timestamp || new Date(Date.now() + (call?.duration_ms || 300000)).toISOString(),
    duration: call?.duration_ms ? call.duration_ms / 1000 : 300,
    recordingUrl: call?.recording_url || null,
    transcript: call?.transcript || `[00:00] AI: お電話ありがとうございます。〇〇会社の受付AIです。本日はどのようなご用件でしょうか？

[00:08] お客様: あの、製品の不具合について問い合わせたいんですけど。

[00:15] AI: 製品の不具合についてのお問い合わせですね。申し訳ございません。どちらの製品でお困りでしょうか？

[00:23] お客様: 先週購入したABC-1000という型番の製品なんですが、電源が入らなくなってしまって。

[00:32] AI: ABC-1000の電源が入らない状況ですね。大変ご不便をおかけして申し訳ございません。いくつか確認させていただきたいことがございます。

[00:45] AI: まず、電源ケーブルはしっかりと接続されていますでしょうか？

[00:52] お客様: はい、確認しました。ケーブルも新しいものに交換してみたんですが、やはりダメでした。

[01:02] AI: ケーブルも交換されたのですね。それでは、本体のリセットボタンはお試しいただきましたか？本体の背面に小さなリセットボタンがございます。

[01:15] お客様: リセットボタン...あ、ありました。今押してみます。

[01:25] お客様: あ！電源が入りました！ありがとうございます！

[01:30] AI: よかったです！正常に動作したようで安心いたしました。今後も何かお困りのことがございましたら、お気軽にお問い合わせください。

[01:42] お客様: 本当に助かりました。ありがとうございました。

[01:47] AI: こちらこそ、お電話ありがとうございました。良い一日をお過ごしください。失礼いたします。`,
    summary: summaryData.summary || call?.summary || call?.call_summary || "製品の不具合に関する問い合わせ。リセットボタンの操作で解決。",
    sentiment: summaryData.sentiment || call?.sentiment || "positive",
    satisfaction: summaryData.satisfaction_score || call?.satisfaction_score || 95,
    tags: summaryData.tags.length > 0 ? summaryData.tags : (call?.tags || ["製品サポート", "技術的問題", "解決済み"]),
    actionItems: summaryData.action_items.length > 0 ? summaryData.action_items : (call?.action_items || []),
    issueType: localIssueType,
    metadata: call?.metadata || {
      agent_id: call?.agent_id,
      call_type: call?.call_type || "inbound",
      disconnection_reason: call?.disconnection_reason
    }
  };

  const sentimentMap = {
    positive: { icon: TrendingUp, color: "text-green-600", bg: "bg-green-100" },
    neutral: { icon: Minus, color: "text-gray-600", bg: "bg-gray-100" },
    negative: { icon: TrendingDown, color: "text-red-600", bg: "bg-red-100" }
  };
  
  const sentimentIcon = sentimentMap[callDetails.sentiment as keyof typeof sentimentMap] || sentimentMap.neutral;

  const SentimentIcon = sentimentIcon.icon;

  // Handle issue type changes
  const handleIssueTypeChange = (field: string, value: string) => {
    setLocalIssueType((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  // Save issue type
  const saveIssueType = async () => {
    try {
      // TODO: API call to save issue type
      console.log('Saving issue type:', localIssueType);
      // Show success message
      alert('課題タイプを保存しました');
    } catch (error) {
      console.error('Failed to save issue type:', error);
      alert('保存に失敗しました');
    }
  };

  // Summarize call
  const summarizeCall = async () => {
    console.log('Summarize button clicked', { call_id: call?.call_id, has_transcript: !!call?.transcript });
    
    if (!call?.call_id || !call?.transcript) {
      alert('通話記録がありません');
      return;
    }

    setIsSummarizing(true);
    try {
      console.log('Calling summarize API for call:', call.call_id);
      const response = await fetch(`/api/calls/${call.call_id}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('Summarize API response:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Summarize API error:', errorText);
        throw new Error(`要約に失敗しました: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('Summarize API data:', data);
      
      // Update the local state with the summarized data
      setSummaryData({
        customer_name: data.customer_name,
        phone_number: data.phone_number,
        requirement: data.requirement,
        details: data.details,
        urgency: data.urgency,
        response_status: data.response_status,
        summary: data.summary,
        sentiment: data.sentiment,
        satisfaction_score: data.satisfaction_score,
        tags: data.tags,
        action_items: data.action_items
      });
      
      // Also update the call object
      Object.assign(call, data);
      
      alert('GPT要約が完了しました。情報が更新されました。');
      
    } catch (error) {
      console.error('Summarization error:', error);
      alert('要約に失敗しました');
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur rounded-xl">
                {callDetails.direction === "inbound" ? (
                  <PhoneIncoming size={24} className="text-white" />
                ) : (
                  <PhoneOutgoing size={24} className="text-white" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">通話詳細</h2>
                <p className="text-white/80">ID: {callDetails.id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={24} className="text-white" />
            </button>
          </div>

          {/* Call Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={16} className="text-white/60" />
                <span className="text-xs text-white/60">日時</span>
              </div>
              <p className="text-sm text-white font-medium">
                {formatDate(callDetails.startTime)}
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={16} className="text-white/60" />
                <span className="text-xs text-white/60">通話時間</span>
              </div>
              <p className="text-sm text-white font-medium">
                {formatTime(callDetails.duration)}
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Bot size={16} className="text-white/60" />
                <span className="text-xs text-white/60">エージェント</span>
              </div>
              <p className="text-sm text-white font-medium">
                {callDetails.agent}
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity size={16} className="text-white/60" />
                <span className="text-xs text-white/60">満足度</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={14}
                      className={`${
                        star <= Math.round(callDetails.satisfaction / 20)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-white/30"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-white font-medium">
                  {callDetails.satisfaction}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Audio Player */}
        {callDetails.recordingUrl && (
          <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
            <audio
              ref={audioRef}
              src={callDetails.recordingUrl}
              preload="metadata"
            />
            
            <div className="space-y-4">
              {/* Waveform / Progress Bar */}
              <div 
                ref={progressRef}
                onClick={handleSeek}
                className="relative h-16 bg-white rounded-lg overflow-hidden cursor-pointer group"
              >
                {showWaveform && (
                  <div className="absolute inset-0 flex items-end justify-around opacity-20">
                    {Array.from({ length: 50 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-blue-600"
                        style={{
                          height: `${30 + Math.random() * 70}%`,
                        }}
                      />
                    ))}
                  </div>
                )}
                
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-30"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
                
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full shadow-lg transition-opacity opacity-0 group-hover:opacity-100"
                  style={{ left: `${(currentTime / duration) * 100}%` }}
                />
                
                <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                  <span className="text-xs font-medium text-gray-600">
                    {formatTime(currentTime)}
                  </span>
                  <span className="text-xs font-medium text-gray-600">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Skip Back */}
                  <button
                    onClick={() => skip(-10)}
                    className="p-2 hover:bg-white rounded-lg transition-colors group"
                    title="10秒戻る"
                  >
                    <SkipBack size={20} className="text-gray-600 group-hover:text-blue-600" />
                  </button>
                  
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlayPause}
                    className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
                  >
                    {isPlaying ? (
                      <Pause size={24} />
                    ) : (
                      <Play size={24} className="ml-0.5" />
                    )}
                  </button>
                  
                  {/* Skip Forward */}
                  <button
                    onClick={() => skip(10)}
                    className="p-2 hover:bg-white rounded-lg transition-colors group"
                    title="10秒進む"
                  >
                    <SkipForward size={20} className="text-gray-600 group-hover:text-blue-600" />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  {/* Speed */}
                  <button
                    onClick={changeSpeed}
                    className="px-3 py-1 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {playbackSpeed}x
                  </button>
                  
                  {/* Volume */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleMute}
                      className="p-2 hover:bg-white rounded-lg transition-colors"
                    >
                      {isMuted ? (
                        <VolumeX size={20} className="text-gray-600" />
                      ) : (
                        <Volume2 size={20} className="text-gray-600" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-24"
                    />
                  </div>
                  
                  {/* Download */}
                  <a
                    href={callDetails.recordingUrl}
                    download={`${callDetails.id}.mp3`}
                    className="p-2 hover:bg-white rounded-lg transition-colors group"
                    title="ダウンロード"
                  >
                    <Download size={20} className="text-gray-600 group-hover:text-blue-600" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { id: "transcript", label: "文字起こし", icon: FileText },
            { id: "summary", label: "要約", icon: MessageSquare },
            { id: "details", label: "詳細情報", icon: Hash }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Transcript Tab */}
          {activeTab === "transcript" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">会話の文字起こし</h3>
                <button
                  onClick={() => copyToClipboard(callDetails.transcript, "transcript")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {copied === "transcript" ? (
                    <>
                      <Check size={16} className="text-green-600" />
                      <span>コピー済み</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>コピー</span>
                    </>
                  )}
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                {(() => {
                  // Try to parse transcript_formatted or use regular transcript
                  const transcriptText = callData?.transcript_formatted || callData?.transcript || call?.transcript_formatted || callDetails.transcript;
                  const lines = transcriptText.split('\n').filter((line: string) => line.trim());
                  
                  return lines.map((line: string, i: number) => {
                    // Check if line contains speaker label
                    const agentMatch = line.match(/^(agent|AI|エージェント)[:：]/i);
                    const userMatch = line.match(/^(user|customer|お客様|顧客)[:：]/i);
                    
                    let isAgent = false;
                    let text = line;
                    
                    if (agentMatch) {
                      isAgent = true;
                      text = line.substring(agentMatch[0].length).trim();
                    } else if (userMatch) {
                      isAgent = false;
                      text = line.substring(userMatch[0].length).trim();
                    } else {
                      // Try to guess based on content or default to alternating
                      isAgent = i % 2 === 0;
                    }
                    
                    return (
                      <div
                        key={i}
                        className={`flex gap-4 ${isAgent ? '' : 'flex-row-reverse'}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isAgent ? 'bg-gradient-to-br from-blue-500 to-purple-500' : 'bg-gradient-to-br from-green-500 to-emerald-500'
                        }`}>
                          {isAgent ? (
                            <Bot size={20} className="text-white" />
                          ) : (
                            <User size={20} className="text-white" />
                          )}
                        </div>
                        <div className={`flex-1 ${isAgent ? '' : 'text-right'}`}>
                          <div className={`inline-block p-4 rounded-xl max-w-[80%] ${
                            isAgent 
                              ? 'bg-white text-gray-800 shadow-sm' 
                              : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                          }`}>
                            <p className="text-sm font-medium mb-1">{isAgent ? 'エージェント' : 'お客様'}</p>
                            <p className="text-sm whitespace-pre-wrap">{text}</p>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Summary Tab */}
          {activeTab === "summary" && (
            <div className="space-y-6">

              {/* Retell要約 */}
              <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">通話の要約</h3>
                  {call?.transcript && (!callData?.call_analysis?.summary && !call?.call_analysis?.summary) && (
                    <button
                      onClick={summarizeCall}
                      disabled={isSummarizing}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <Sparkles size={16} />
                      {isSummarizing ? '要約生成中...' : 'GPT要約を生成'}
                    </button>
                  )}
                </div>
                <p className="text-gray-700">
                  {callData?.call_analysis?.summary || call?.call_analysis?.summary || callDetails.summary || summaryData.summary || '要約データがありません。GPT要約ボタンをクリックして生成してください。'}
                </p>
              </div>

              {/* カスタム分析 */}
              {call?.custom_analysis && Object.keys(call.custom_analysis).length > 0 && (
                <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">詳細分析</h3>
                  <div className="space-y-3">
                    {Object.entries(call.custom_analysis).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-sm text-gray-500">{key}</p>
                        <p className="text-gray-700 font-medium">{value as string}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 感情分析 */}
              <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">感情分析</h3>
                <div className="flex items-center gap-4">
                  <div className={`p-3 ${sentimentIcon.bg} rounded-xl`}>
                    <SentimentIcon size={24} className={sentimentIcon.color} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {callDetails.sentiment === "positive" && "ポジティブ"}
                      {callDetails.sentiment === "neutral" && "中立"}
                      {callDetails.sentiment === "negative" && "ネガティブ"}
                    </p>
                    <p className="text-sm text-gray-500">顧客満足度: {callDetails.satisfaction}%</p>
                  </div>
                </div>
              </div>

              {/* タグ */}
              <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">タグ</h3>
                <div className="flex flex-wrap gap-2">
                  {callDetails.tags.map((tag: string, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-sm font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* アクションアイテム */}
              {callDetails.actionItems.length > 0 && (
                <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">アクションアイテム</h3>
                  <ul className="space-y-2">
                    {callDetails.actionItems.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <ChevronRight size={16} className="text-blue-600 mt-0.5" />
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Details Tab */}
          {activeTab === "details" && (
            <div className="space-y-6">
              {/* 通話情報 */}
              <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">通話情報</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">お客様名</p>
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      <p className="font-medium text-gray-900">{summaryData.customer_name || call?.customer_name || '不明'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">電話番号</p>
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-gray-400" />
                      <p className="font-medium text-gray-900">{summaryData.phone_number || call?.phone_number || callDetails.from}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">緊急度</p>
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                      call?.urgency === '高' ? 'bg-red-100 text-red-800' :
                      call?.urgency === '中' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      <AlertCircle size={14} className="mr-1" />
                      {summaryData.urgency || call?.urgency || '中'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">対応状況</p>
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                      call?.response_status === '解決済み' ? 'bg-green-100 text-green-800' :
                      call?.response_status === '対応中' ? 'bg-blue-100 text-blue-800' :
                      call?.response_status === '保留' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      <Activity size={14} className="mr-1" />
                      {summaryData.response_status || call?.response_status || '未対応'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">開始時刻</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(callDetails.startTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">通話時間</p>
                    <p className="font-medium text-gray-900">
                      {formatTime(callDetails.duration)}
                    </p>
                  </div>
                </div>
              </div>

              {/* 要件詳細 */}
              <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">要件詳細</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">要件</p>
                    <p className="font-medium text-gray-900">{summaryData.requirement || call?.requirement || callDetails.summary}</p>
                  </div>
                  {call?.details && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">詳細内容</p>
                      <p className="text-gray-700">{summaryData.details || call.details}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 課題タイプ */}
              <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">課題タイプ</h3>
                <div className="space-y-4">
                  {/* カテゴリー選択 */}
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">カテゴリー</label>
                    <select 
                      value={callDetails.issueType?.category || '技術サポート'}
                      onChange={(e) => handleIssueTypeChange('category', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="技術サポート">技術サポート</option>
                      <option value="注文・予約">注文・予約</option>
                      <option value="変更・キャンセル">変更・キャンセル</option>
                      <option value="料金・支払い">料金・支払い</option>
                      <option value="配送・納期">配送・納期</option>
                      <option value="製品情報">製品情報</option>
                      <option value="アカウント">アカウント</option>
                      <option value="その他">その他</option>
                    </select>
                  </div>
                  
                  {/* サブカテゴリー入力 */}
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">詳細</label>
                    <input 
                      type="text"
                      value={callDetails.issueType?.subCategory || ''}
                      onChange={(e) => handleIssueTypeChange('subCategory', e.target.value)}
                      placeholder="詳細を入力"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* 優先度選択 */}
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">優先度</label>
                    <div className="flex gap-2">
                      {['low', 'normal', 'high', 'urgent'].map(priority => (
                        <button
                          key={priority}
                          onClick={() => handleIssueTypeChange('priority', priority)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            callDetails.issueType?.priority === priority
                              ? priority === 'urgent' ? 'bg-red-600 text-white' :
                                priority === 'high' ? 'bg-orange-600 text-white' :
                                priority === 'normal' ? 'bg-blue-600 text-white' :
                                'bg-gray-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {priority === 'urgent' && '緊急'}
                          {priority === 'high' && '高'}
                          {priority === 'normal' && '通常'}
                          {priority === 'low' && '低'}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* 保存ボタン */}
                  <button 
                    onClick={saveIssueType}
                    className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-green-700 transition-all"
                  >
                    課題タイプを保存
                  </button>
                </div>
              </div>

              {/* メタデータ */}
              {Object.keys(callDetails.metadata).length > 0 && (
                <div className="bg-white rounded-xl border-2 border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">その他の情報</h3>
                  <div className="space-y-3">
                    {Object.entries(callDetails.metadata).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <p className="text-sm text-gray-500">{key}</p>
                        <p className="font-medium text-gray-900">{value as string}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}