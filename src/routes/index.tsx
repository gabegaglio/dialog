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
  >("24h");

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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Dashboard */}
      <div className="flex-1 flex flex-col p-6 space-y-4">
        {/* Top Section - GLUCOSE with Status and 24HOUR AVG */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Current Glucose
                </h2>
                <p className="text-sm text-blue-600">Last reading</p>
              </div>
            </div>
            {glucoseStatus && (
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  glucoseStatus.status === "Normal"
                    ? "bg-green-100 text-green-800 border border-green-200"
                    : glucoseStatus.status === "Low"
                    ? "bg-red-100 text-red-800 border border-red-200"
                    : glucoseStatus.status === "High"
                    ? "bg-red-100 text-red-800 border border-red-200"
                    : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                }`}
              >
                {glucoseStatus.status}
              </div>
            )}
          </div>

          {currentGlucose ? (
            <div className="flex items-end justify-between">
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold text-gray-900">
                  {currentGlucose}
                </span>
                <span className="text-lg text-gray-600 font-medium">mg/dL</span>
              </div>
              {/* 24h Stats - Always calculated from 24h data */}
              <div className="text-right space-y-2">
                <div>
                  <div className="text-xs text-gray-600 mb-1">24h Avg</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {data24h && data24h.length > 0
                      ? Math.round(
                          data24h.reduce(
                            (sum, reading) => sum + reading.mgdl,
                            0
                          ) / data24h.length
                        )
                      : "--"}
                  </div>
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
          ) : (
            <div className="flex items-end justify-between">
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold text-gray-400">--</span>
                <span className="text-lg text-gray-500 font-medium">mg/dL</span>
              </div>
            </div>
          )}
        </div>

        {/* Middle Button Row - RANGE, TREND, UPDATED */}
        <div className="grid grid-cols-3 gap-4">
          {/* Target Range Card */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">
                Target Range
              </h3>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <div className="text-xl font-bold text-gray-900">70-180</div>
            <div className="text-xs text-gray-500">mg/dL</div>
          </div>

          {/* Trend Card */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
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
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Updated</h3>
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
            <div className="text-xl font-bold text-gray-900">
              {timeSinceLast || "--"}
            </div>
          </div>
        </div>

        {/* Chart Header - More Concealed */}
        <div className="text-center opacity-60">
          <span className="text-sm text-gray-600">Glucose Trend Chart</span>
        </div>

        {/* Bottom White Section - Graph with Time Selectors */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          {/* Time Range Selectors */}
          <div className="flex items-center gap-4 mb-4">
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

          {/* Graph Area */}
          <div className="flex-1 min-h-[400px]">
            <GlucoseLine data={data ?? []} showTargetRange={true} />
          </div>
        </div>
      </div>

      {/* Right Panel - Chat Box */}
      <div className="w-96 bg-gray-50 p-4 flex flex-col">
        <div className="flex-1 bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
            AI Chat Assistant
          </h2>

          {/* Messages */}
          <div className="flex-1 space-y-3 mb-4 max-h-[500px] overflow-y-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg ${
                    message.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 px-3 py-2 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={chatLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
