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
import { useEffect, useState } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  isStreaming?: boolean;
}

export default function Dashboard() {
  const { data, isLoading, error, dataSource, isFetching } = useGlucoseData({
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

  // Prefetch all ranges for seamless transitions
  const { prefetchAll } = usePrefetchGlucoseData();

  useEffect(() => {
    // Prefetch all ranges when component mounts
    prefetchAll();
  }, [prefetchAll]);

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

  // Chat functions
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setChatLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm here to help with your diabetes management questions! This is a demo response.",
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setChatLoading(false);
    }, 1000);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Dashboard */}
      <div className="flex-1 flex flex-col p-6 space-y-4">
        {/* Top Black Section - GLUCOSE with NORMAL and 24HOUR AVG */}
        <div className="bg-black text-white rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">GLUCOSE</h1>
              <div className="flex flex-col text-sm">
                <span className="text-green-400">NORMAL</span>
                <span className="text-blue-400">24HOUR AVG</span>
              </div>
            </div>
            <button className="text-blue-400 hover:text-blue-300">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Middle Button Row - RANGE, TREND, UPDATED */}
        <div className="flex gap-4">
          <button className="flex-1 bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors">
            RANGE
          </button>
          <button className="flex-1 bg-red-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-600 transition-colors">
            TREND
          </button>
          <button className="flex-1 bg-cyan-400 text-black font-bold py-3 px-4 rounded-lg hover:bg-cyan-500 transition-colors">
            UPDATED
          </button>
        </div>

        {/* RANGE SELECTOR Text */}
        <div className="text-center">
          <span className="text-lg font-semibold text-gray-800">RANGE SELECTOR</span>
        </div>

        {/* Bottom White Section - Graph with Time Selectors */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          {/* Time Range Selectors */}
          <div className="flex gap-2 mb-4">
            <button className="px-4 py-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors">
              3H
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors">
              6H
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors">
              12H
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors">
              24H
            </button>
          </div>
          
          {/* Graph Area */}
          <div className="flex-1 min-h-[400px]">
            <GlucoseLine data={data ?? []} />
          </div>
        </div>
      </div>

      {/* Right Panel - Chat Box */}
      <div className="w-96 bg-green-400 p-4 flex flex-col">
        <div className="flex-1 bg-white rounded-lg p-4 mb-4">
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">CHAT BOX</h2>
          
          {/* Messages */}
          <div className="flex-1 space-y-3 mb-4 max-h-[500px] overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
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
                    {message.timestamp.toLocaleTimeString()}
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
