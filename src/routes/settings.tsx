import { useState } from "react";
import {
  Settings as SettingsIcon,
  Database,
  Link,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Info,
} from "lucide-react";

export default function Settings() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock connection status - replace with real API calls
  const [connectionStatus] = useState({
    connected: false,
    tokenValid: false,
    expiresAt: null,
  });

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // TODO: Implement actual connection logic
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      // TODO: Implement actual disconnection logic
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // TODO: Implement actual refresh logic
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Settings
          </h1>
          <p className="text-gray-600 mt-1 font-medium">
            Configure your diabetes tracker preferences
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Dexcom Connection Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Dexcom Connection
              </h2>
              <p className="text-blue-100 text-sm">
                Connect your Dexcom account to sync glucose data
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Connection Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-600">
                  Connection Status
                </span>
                {connectionStatus.connected ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {connectionStatus.connected ? "Connected" : "Disconnected"}
              </p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-600">
                  Token Status
                </span>
                {connectionStatus.tokenValid ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {connectionStatus.tokenValid ? "Valid" : "Invalid"}
              </p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-600 mb-2 block">
                Expires
              </span>
              <p className="text-lg font-semibold text-gray-900">
                {connectionStatus.expiresAt ? "Soon" : "N/A"}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleConnect}
              disabled={isConnecting || connectionStatus.connected}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Link className="w-4 h-4" />
              {isConnecting ? "Connecting..." : "Connect to Dexcom"}
            </button>

            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting || !connectionStatus.connected}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white font-medium rounded-lg hover:from-red-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <XCircle className="w-4 h-4" />
              {isDisconnecting ? "Disconnecting..." : "Disconnect"}
            </button>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing || !connectionStatus.connected}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh Token"}
            </button>
          </div>

          {/* Authorization URL Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Authorization URL
              </span>
            </div>
            <p className="text-sm text-blue-700 mb-2">
              Click the Connect button above to generate an authorization URL
              for Dexcom.
            </p>
            <div className="bg-white border border-blue-200 rounded px-3 py-2 text-sm text-gray-600 font-mono">
              https://sandbox-api.dexcom.com/v2/oauth2/login?...
            </div>
          </div>
        </div>
      </div>

      {/* Instructions Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Info className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Setup Instructions
              </h2>
              <p className="text-green-100 text-sm">
                Follow these steps to connect your Dexcom account
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                1
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  Get Dexcom API Credentials
                </p>
                <p className="text-gray-600 text-sm">
                  Visit the{" "}
                  <a
                    href="https://developer.dexcom.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium underline"
                  >
                    Dexcom Developer Portal
                  </a>{" "}
                  and create a new application to get your Client ID and Client
                  Secret.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                2
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  Configure Environment Variables
                </p>
                <p className="text-gray-600 text-sm">
                  Add your Dexcom credentials to the{" "}
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">
                    .env
                  </code>{" "}
                  file in the backend directory.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                3
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  Connect Your Account
                </p>
                <p className="text-gray-600 text-sm">
                  Click the "Connect to Dexcom" button above and follow the
                  OAuth flow to authorize access to your glucose data.
                </p>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <span className="font-medium text-amber-800">
                Important Notes
              </span>
            </div>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>
                • This application uses the Dexcom Sandbox API for development
                purposes
              </li>
              <li>
                • Your data is stored securely and never shared with third
                parties
              </li>
              <li>
                • You can disconnect your account at any time using the
                disconnect button
              </li>
              <li>
                • The application will automatically refresh your access token
                when needed
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
