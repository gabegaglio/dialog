import {
  useGlucoseData,
  usePrefetchGlucoseData,
} from "../hooks/useGlucoseQuery";
import GlucoseLine from "../components/charts/GlucoseLine";

import {
  Activity,
  TrendingUp,
  Database,
  AlertCircle,
  Zap,
  Target,
  Clock,
  AlertTriangle,
  X,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  isStreaming?: boolean;
}

export default function Dashboard() {
  // State for selected time range
  const [selectedRange, setSelectedRange] = useState<
    "3h" | "6h" | "12h" | "24h"
  >("12h");

  // Dexcom connection status state
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    tokenValid: false,
    expiresAt: null as string | null,
  });

  // Dexcom user info state
  const [dexcomUser, setDexcomUser] = useState<string>("");

  const { data, isLoading, error, dataSource, isFetching } = useGlucoseData({
    range: selectedRange,
  });

  // Always fetch 24h data for stats display
  const { data: data24h } = useGlucoseData({
    range: "24h",
  });

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hello! I'm your AI diabetes management assistant. I can help you understand your glucose data, provide lifestyle advice, and answer questions about diabetes care. How can I help you today?",
      role: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const streamIntervalRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Prefetch all ranges for seamless transitions
  const { prefetchAll } = usePrefetchGlucoseData();

  useEffect(() => {
    // Prefetch all ranges when component mounts
    prefetchAll();
  }, [prefetchAll]);

  // Cleanup streaming on unmount
  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, []);

  // Auto-scroll to bottom when messages change (only within chat container)
  useEffect(() => {
    if (messagesContainerRef.current && messagesEndRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages, chatLoading]);

  // Check Dexcom connection status on mount
  useEffect(() => {
    const checkDexcomStatus = async () => {
      try {
        const response = await fetch(
          "http://localhost:8000/dexcom/status/default_user"
        );
        const data = await response.json();
        setConnectionStatus({
          connected: data.connected || false,
          tokenValid: data.token_valid || false,
          expiresAt: data.expires_at || null,
        });

        // If connected, fetch user info
        if (data.connected && data.token_valid) {
          try {
            const userResponse = await fetch(
              "http://localhost:8000/dexcom/user-info/default_user"
            );
            const userData = await userResponse.json();
            if (userData.success && userData.user) {
              setDexcomUser(userData.user.username || "default_user");
            } else {
              setDexcomUser("default_user");
            }
          } catch (err) {
            console.error("Failed to fetch user info:", err);
            setDexcomUser("default_user");
          }
        }
      } catch (err) {
        console.error("Failed to check Dexcom status:", err);
      }
    };

    checkDexcomStatus();
  }, []);

  if (isLoading && !data.length)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );

  if (error)
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">Failed to load glucose data</p>
        <p className="text-red-600 text-sm mt-1">Please try again later</p>
      </div>
    );

  const currentGlucose =
    data && data.length > 0 ? data[data.length - 1]?.mgdl : null;

  // Calculate glucose status and zone
  const getGlucoseStatus = (glucose: number) => {
    if (glucose < 70)
      return {
        status: "Low",
        color: "text-red-600",
        bgColor: "bg-red-100",
        borderColor: "border-red-200",
        icon: AlertTriangle,
      };
    if (glucose < 180)
      return {
        status: "Normal",
        color: "text-green-600",
        bgColor: "bg-green-100",
        borderColor: "border-green-200",
        icon: Target,
      };
    if (glucose < 250)
      return {
        status: "Elevated",
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        borderColor: "border-yellow-200",
        icon: AlertTriangle,
      };
    return {
      status: "High",
      color: "text-red-600",
      bgColor: "bg-red-100",
      borderColor: "border-red-200",
      icon: AlertTriangle,
    };
  };

  // Calculate time since last reading
  const getTimeSinceLastReading = () => {
    if (!data || data.length === 0) return null;

    const lastReading = new Date(data[data.length - 1].ts);
    const now = new Date();
    const diffMs = now.getTime() - lastReading.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ${diffMinutes % 60}m ago`;
  };

  const glucoseStatus = currentGlucose
    ? getGlucoseStatus(currentGlucose)
    : null;
  const timeSinceLast = getTimeSinceLastReading();

  // Function to stop streaming
  const stopStreaming = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }

    if (streamingMessageId) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMessageId ? { ...msg, isStreaming: false } : msg
        )
      );
      setStreamingMessageId(null);
    }

    setChatLoading(false);
  };

  // Function to simulate streaming effect
  const streamMessage = (fullContent: string, messageId: string) => {
    const words = fullContent.split(" ");
    let currentIndex = 0;

    setTimeout(() => {
      const streamInterval = setInterval(() => {
        if (currentIndex < words.length) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    content: words.slice(0, currentIndex + 1).join(" "),
                    isStreaming: true,
                  }
                : msg
            )
          );
          currentIndex++;
        } else {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId ? { ...msg, isStreaming: false } : msg
            )
          );
          clearInterval(streamInterval);
          setStreamingMessageId(null);
          setChatLoading(false);
        }
      }, 30);

      streamIntervalRef.current = streamInterval;
    }, 300);
  };

  // Chat functions
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || chatLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setChatLoading(true);

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inputMessage,
          user_id: "default_user",
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "",
          role: "assistant",
          timestamp: new Date(),
          isStreaming: true,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingMessageId(assistantMessage.id);

        streamMessage(data.response, assistantMessage.id);
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setChatLoading(false);
    }
  };

  // Quick insight functions
  const handleQuickInsight = async (insightType: string) => {
    let message = "";

    switch (insightType) {
      case "daily_summary":
        message =
          "Please provide me with a daily summary of my glucose data, including key metrics and any notable patterns from the last 24 hours.";
        break;
      case "trend_analysis":
        message =
          "Can you analyze the trends in my glucose data over the past 24 hours? I'd like to understand any patterns or changes.";
        break;
      case "pattern_review":
        message =
          "Please review my glucose patterns and identify any recurring trends or unusual readings that I should be aware of.";
        break;
      case "recommendations":
        message =
          "Based on my recent glucose data, what lifestyle recommendations or monitoring suggestions can you provide?";
        break;
      default:
        message = "Please analyze my glucose data and provide insights.";
    }

    // Set the message and send it
    setInputMessage(message);
    // Small delay to ensure state is updated
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {/* Left Panel - Dashboard */}
      <div className="flex-1 flex flex-col p-6 space-y-4 pb-20">
        {/* Top Section - Live Glucose and Info Boxes */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left - Live Glucose Box */}
          <div className="w-full lg:w-fit bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Current Glucose
                </h2>
                <p className="text-sm text-blue-600">Last reading</p>
              </div>
            </div>

            {currentGlucose ? (
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold text-gray-900">
                  {currentGlucose}
                </span>
                <div className="flex flex-col items-start">
                  <div className="text-sm text-green-700 font-semibold leading-none bg-green-100 px-2 py-1 rounded-2xl">
                    Normal
                  </div>
                  <span className="text-lg text-gray-600 font-medium leading-none">
                    mg/dL
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold text-gray-400">--</span>
                <span className="text-lg text-gray-500 font-medium">mg/dL</span>
              </div>
            )}
          </div>

          {/* Right - 2x2 Grid of Info Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            {/* 24h Average Card */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">
                  24h Average
                </h3>
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
              <div className="text-xl font-bold text-blue-600">
                {data24h && data24h.length > 0
                  ? Math.round(
                      data24h.reduce((sum, reading) => sum + reading.mgdl, 0) /
                        data24h.length
                    )
                  : "--"}
              </div>
              <div className="text-xs text-gray-500">mg/dL</div>
            </div>

            {/* Target Range Card */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">
                  Target Range
                </h3>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xl font-bold text-gray-900">70-180</div>
                  <div className="text-xs text-gray-500">mg/dL</div>
                </div>
                <div className="flex gap-3 text-xs">
                  <div>
                    <div className="text-gray-500">High</div>
                    <div className="font-semibold text-red-600">
                      {data24h && data24h.length > 0
                        ? Math.max(...data24h.map((r) => r.mgdl))
                        : "--"}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Low</div>
                    <div className="font-semibold text-blue-600">
                      {data24h && data24h.length > 0
                        ? Math.min(...data24h.map((r) => r.mgdl))
                        : "--"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trend Card */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Trend</h3>
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {currentGlucose && data && data.length > 1
                  ? currentGlucose > data[data.length - 2]?.mgdl
                    ? "↗ Rising"
                    : currentGlucose < data[data.length - 2]?.mgdl
                    ? "↘ Falling"
                    : "→ Stable"
                  : "→ Stable"}
              </div>
            </div>

            {/* Time Card */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Updated</h3>
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {timeSinceLast || "--"}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom White Section - Graph with Time Selectors */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm p-4">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Glucose Trend
                </h3>
                <p className="text-gray-600 text-sm">
                  Real-time glucose monitoring data
                </p>
              </div>
            </div>
          </div>

          {/* Time Range Selectors */}
          <div className="flex items-center gap-4 px-6 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                Time Range:
              </span>
              <div className="flex gap-1">
                {[
                  { value: "3h", label: "3 Hours", icon: Clock },
                  { value: "6h", label: "6 Hours", icon: Clock },
                  { value: "12h", label: "12 Hours", icon: Clock },
                  { value: "24h", label: "24 Hours", icon: Clock },
                ].map((range) => {
                  const isSelected = selectedRange === range.value;
                  const IconComponent = range.icon;

                  return (
                    <button
                      key={range.value}
                      onClick={() =>
                        setSelectedRange(
                          range.value as "3h" | "6h" | "12h" | "24h"
                        )
                      }
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                          : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-gray-600 hover:text-blue-600"
                      }`}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                      {range.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Graph Area - No inner box, direct graph */}
          <div className="flex-1 min-h-[300px] -m-1">
            <GlucoseLine
              data={data ?? []}
              showTargetRange={true}
              timeRange={selectedRange}
            />
          </div>
        </div>
      </div>

      {/* Right Panel - Chat Assistant */}
      <div className="w-[500px] flex flex-col p-6 pb-20 bg-gray-50">
        {/* Health Assistant Card - Full Height */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col h-0">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4 flex-shrink-0">
            <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Health Assistant
              </h2>
              <p className="text-sm text-green-600">AI-powered insights</p>
            </div>
          </div>

          {/* Quick Health Insights - Inside Chat */}
          <div className="grid grid-cols-4 gap-2 mb-4 pb-4 border-b border-gray-100 flex-shrink-0">
            <button
              onClick={() => handleQuickInsight("daily_summary")}
              className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md p-2 text-center transition-colors"
            >
              <div className="text-xs font-medium text-blue-800">Summary</div>
            </button>
            <button
              onClick={() => handleQuickInsight("trend_analysis")}
              className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-md p-2 text-center transition-colors"
            >
              <div className="text-xs font-medium text-green-800">Trends</div>
            </button>
            <button
              onClick={() => handleQuickInsight("pattern_review")}
              className="bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-md p-2 text-center transition-colors"
            >
              <div className="text-xs font-medium text-yellow-800">
                Patterns
              </div>
            </button>
            <button
              onClick={() => handleQuickInsight("recommendations")}
              className="bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md p-2 text-center transition-colors"
            >
              <div className="text-xs font-medium text-purple-800">Tips</div>
            </button>
          </div>

          {/* Chat Messages */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto mb-4 min-h-0 pr-2"
          >
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-md ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    {message.isStreaming && (
                      <div className="inline-block w-2 h-2 bg-current rounded-full animate-pulse ml-1"></div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Chat Input */}
          <div className="flex gap-2 border-t border-gray-100 pt-4 flex-shrink-0">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              onClick={handleSendMessage}
              disabled={chatLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Full-width Disclaimer Footer - Outside of columns */}
      <div className="fixed bottom-0 left-0 right-0 bg-blue-50 border-t border-blue-200 p-3 z-10">
        <div className="flex items-start gap-2 max-w-7xl mx-auto">
          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">!</span>
          </div>
          <p className="text-xs text-blue-800">
            This AI provides educational insights about your glucose data. For
            medical decisions, medication changes, or treatment plans, always
            consult your healthcare provider.
          </p>
        </div>
      </div>
    </div>
  );
}
