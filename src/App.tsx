import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  MessageCircle,
  Settings as SettingsIcon,
  Activity,
  Menu,
  CheckCircle,
  XCircle,
  Bot,
} from "lucide-react";
import Dashboard from "./routes";
import Trends from "./routes/trends";
import Chat from "./routes/chat";
import Settings from "./routes/settings";
import AuthCallback from "./routes/auth-callback";

// Navigation component that uses React Router hooks
function Navigation({
  connectionStatus,
  setConnectionStatus,
}: {
  connectionStatus: {
    connected: boolean;
    tokenValid: boolean;
    expiresAt: string | null;
  };
  setConnectionStatus: React.Dispatch<
    React.SetStateAction<{
      connected: boolean;
      tokenValid: boolean;
      expiresAt: string | null;
    }>
  >;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dexcomStatus, setDexcomStatus] = useState<{
    show: boolean;
    type: "success" | "error";
    message: string;
  }>({ show: false, type: "success", message: "" });
  const [dexcomUser, setDexcomUser] = useState<string>("");

  // Handle Dexcom OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const dexcomParam = urlParams.get("dexcom");

    if (dexcomParam === "success") {
      setDexcomStatus({
        show: true,
        type: "success",
        message: "Successfully connected to Dexcom!",
      });

      // Immediately update connection status to connected
      setConnectionStatus({
        connected: true,
        tokenValid: true,
        expiresAt: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
      });

      // Also fetch the actual connection status from backend to get real data
      fetch("http://localhost:8000/dexcom/status/default_user")
        .then((response) => response.json())
        .then((data) => {
          if (data.connected) {
            setConnectionStatus({
              connected: data.connected,
              tokenValid: data.token_valid || false,
              expiresAt: data.expires_at || null,
            });
          }
        })
        .catch((err) => {
          console.error("Failed to check connection status:", err);
        });

      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (dexcomParam === "error") {
      const errorMessage =
        urlParams.get("message") || "Failed to connect to Dexcom";
      setDexcomStatus({
        show: true,
        type: "error",
        message: errorMessage,
      });
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [setConnectionStatus]);

  // Check connection status and fetch user info when entering settings tab
  useEffect(() => {
    if (location.pathname === "/settings") {
      fetch("http://localhost:8000/dexcom/status/default_user")
        .then((response) => response.json())
        .then((data) => {
          setConnectionStatus({
            connected: data.connected || false,
            tokenValid: data.token_valid || false,
            expiresAt: data.expires_at || null,
          });

          // If connected, fetch user info
          if (data.connected && data.token_valid) {
            fetch("http://localhost:8000/dexcom/user-info/default_user")
              .then((response) => response.json())
              .then((userData) => {
                if (userData.success && userData.user) {
                  setDexcomUser(userData.user.username || "User");
                }
              })
              .catch((err) => {
                console.error("Failed to fetch user info:", err);
                setDexcomUser("User");
              });
          }
        })
        .catch((err) => {
          console.error("Failed to check connection status:", err);
          setConnectionStatus({
            connected: false,
            tokenValid: false,
            expiresAt: null,
          });
        });
    }
  }, [location.pathname, setConnectionStatus]);

  // Auto-hide status message after 5 seconds
  useEffect(() => {
    if (dexcomStatus.show) {
      const timer = setTimeout(() => {
        setDexcomStatus({ show: false, type: "success", message: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [dexcomStatus.show]);

  const navItems = [
    { key: "/", label: "Dashboard", icon: Activity },
    { key: "/trends", label: "Trends", icon: TrendingUp },
    { key: "/chat", label: "Assistant", icon: Bot },
    { key: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <>
      {/* Modern Navigation Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="text-xl font-bold text-gray-900">Dia-Log</h1>
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = location.pathname === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => navigate(item.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      isActive
                        ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Right side: Mobile Menu Button and User Profile */}
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>

              {/* Dexcom Connection Status */}
              <div className="flex items-center gap-2">
                {connectionStatus.connected ? (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-medium text-green-800">
                      Connected to Dexcom
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-xs font-medium text-gray-600">
                      Not Connected
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-100 bg-white">
              <nav className="px-2 pt-2 pb-3 space-y-1">
                {navItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = location.pathname === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        navigate(item.key);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-3 ${
                        isActive
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Dexcom Status Message */}
      {dexcomStatus.show && (
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4`}>
          <div
            className={`rounded-lg p-4 flex items-center gap-3 ${
              dexcomStatus.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {dexcomStatus.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <span className="font-medium">{dexcomStatus.message}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/chat" element={<Chat />} />
          <Route
            path="/settings"
            element={
              <Settings
                connectionStatus={connectionStatus}
                setConnectionStatus={setConnectionStatus}
              />
            }
          />
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </main>
    </>
  );
}

// Main App component with React Router setup
export default function App() {
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    tokenValid: false,
    expiresAt: null,
  });

  // Check connection status when app first loads
  useEffect(() => {
    fetch("http://localhost:8000/dexcom/status/default_user")
      .then((response) => response.json())
      .then((data) => {
        setConnectionStatus({
          connected: data.connected || false,
          tokenValid: data.token_valid || false,
          expiresAt: data.expires_at || null,
        });
      })
      .catch((err) => {
        console.error("Failed to check initial connection status:", err);
      });
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <Navigation
          connectionStatus={connectionStatus}
          setConnectionStatus={setConnectionStatus}
        />
      </div>
    </Router>
  );
}
