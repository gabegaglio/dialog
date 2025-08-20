import { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Loader2,
  MessageCircle,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  isStreaming?: boolean;
}

export default function Chat() {
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
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const streamIntervalRef = useRef<number | null>(null);

  // Function to stop streaming
  const stopStreaming = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }

    // Mark the current streaming message as complete
    if (streamingMessageId) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMessageId ? { ...msg, isStreaming: false } : msg
        )
      );
      setStreamingMessageId(null);
    }

    setIsLoading(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, []);

  // Function to simulate streaming effect
  const streamMessage = (fullContent: string, messageId: string) => {
    const words = fullContent.split(" ");
    let currentIndex = 0;

    console.log(
      "Starting to stream message:",
      messageId,
      "Words:",
      words.length
    );

    // Small delay before starting to stream
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
          console.log("Finished streaming message:", messageId);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId ? { ...msg, isStreaming: false } : msg
            )
          );
          clearInterval(streamInterval);
          setStreamingMessageId(null);
          setIsLoading(false);
        }
      }, 30); // Faster streaming for better effect

      // Store the interval reference for stopping
      streamIntervalRef.current = streamInterval;
    }, 300); // Initial delay to show typing indicator
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

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
        setStreamingMessageId(assistantMessage.id); // Set the ID for stopping

        // Start streaming the response
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessageContent = (content: string) => {
    // Basic markdown-like formatting for newlines and bold text
    return content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold text
      .replace(/\n/g, "<br/>"); // Newlines
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            AI Chat Assistant
          </h1>
          <p className="text-gray-600 mt-1 font-medium">
            Get personalized diabetes management advice and insights
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Diabetes Management AI
              </h2>
              <p className="text-gray-600 text-sm">
                Ask me about glucose trends, lifestyle tips, or diabetes care
              </p>
            </div>
          </div>

          {/* Streaming indicator */}
          {(isLoading || streamingMessageId) && (
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-purple-600">
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                <span>
                  {streamingMessageId
                    ? "AI is responding..."
                    : "AI is thinking..."}
                </span>
              </div>
              <button
                onClick={stopStreaming}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-md hover:bg-gray-200 transition-colors font-medium border border-gray-300"
                title="Stop AI response"
              >
                Stop
              </button>
            </div>
          )}
        </div>

        {/* Messages Container */}
        <div
          className="h-96 overflow-y-auto p-6 space-y-4 relative"
          ref={messagesContainerRef}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-purple-600" />
                </div>
              )}

              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                  message.role === "user"
                    ? "bg-blue-50 text-gray-900 shadow-sm border border-blue-200"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {message.isStreaming ? (
                  <div
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: formatMessageContent(message.content),
                    }}
                  ></div>
                ) : (
                  <div
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: formatMessageContent(message.content),
                    }}
                  />
                )}

                {/* Add cursor for streaming messages */}
                {message.isStreaming && (
                  <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse"></span>
                )}
                <p
                  className={`text-xs mt-2 ${
                    message.role === "user" ? "text-gray-600" : "text-gray-500"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-purple-600" />
              </div>
              <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
              <button
                onClick={stopStreaming}
                className="px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded-md hover:bg-gray-100 transition-colors border border-gray-200 hover:border-gray-300 self-start"
                title="Stop AI response"
              >
                Stop
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Section */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about your glucose data, diabetes management, or lifestyle tips..."
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Stop button - show when AI is responding (streaming or thinking) */}
            {(isLoading || streamingMessageId) && (
              <button
                onClick={stopStreaming}
                className="flex-shrink-0 px-3 py-2 bg-gray-50 text-gray-500 text-xs rounded-md hover:bg-gray-100 transition-colors border border-gray-200 hover:border-gray-300"
                title="Stop AI response"
              >
                Stop
              </button>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Safety Warning - Moved below chat and made less prominent */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-3 h-3 text-blue-600" />
            </div>
          </div>
          <div>
            <h3 className="text-blue-800 font-medium text-sm">
              Important Note
            </h3>
            <p className="text-blue-700 text-sm mt-1">
              This AI provides educational insights about your glucose data. For
              medical decisions, medication changes, or treatment plans, always
              consult your healthcare provider.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons - Moved below the chat box */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Health Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => setInputMessage("How is my glucose doing today?")}
            className="flex items-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Daily Summary
          </button>

          <button
            onClick={() =>
              setInputMessage("What trends do you see in my glucose data?")
            }
            className="flex items-center gap-2 px-4 py-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-green-700 font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Trend Analysis
          </button>

          <button
            onClick={() =>
              setInputMessage(
                "Are there any concerning patterns in my readings?"
              )
            }
            className="flex items-center gap-2 px-4 py-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-amber-700 font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Pattern Review
          </button>

          <button
            onClick={() =>
              setInputMessage(
                "What lifestyle recommendations do you have based on my data?"
              )
            }
            className="flex items-center gap-2 px-4 py-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-purple-700 font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Recommendations
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-3">
          Click any button above to get instant AI analysis of your glucose
          data, or type your own question above.
        </p>
      </div>

      {/* Features Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">AI-Powered</h3>
          </div>
          <p className="text-gray-600 text-sm">
            Get intelligent insights about your glucose patterns and diabetes
            management
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">24/7 Support</h3>
          </div>
          <p className="text-gray-600 text-sm">
            Ask questions anytime about your diabetes care and get immediate
            responses
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Personalized</h3>
          </div>
          <p className="text-gray-600 text-sm">
            Receive tailored advice based on your specific diabetes management
            needs
          </p>
        </div>
      </div>
    </div>
  );
}
