import { useState, useEffect } from "react";
import {
  Database,
  Link,
  XCircle,
  CheckCircle,
  ExternalLink,
  Info,
  AlertCircle,
} from "lucide-react";
import { useDexcomConnect } from "../hooks/useDexcomConnect";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "../components/ui/sidebar";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";

interface SettingsProps {
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
}

export default function Settings({
  connectionStatus,
  setConnectionStatus,
}: SettingsProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const { connectToDexcom, disconnectFromDexcom, loading, error } =
    useDexcomConnect();

  // Reset connecting state when connection status changes
  useEffect(() => {
    if (connectionStatus.connected) {
      // The loading state is handled by the hook
    }
  }, [connectionStatus.connected]);

  const handleConnect = async () => {
    if (loading) return;

    try {
      // Don't hardcode user ID - let Dexcom determine the actual user
      await connectToDexcom();
    } catch (err) {
      console.error("Connection failed:", err);
      // Error state is handled by the hook
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      // Get the current connected user ID from connection status or use a dynamic approach
      const currentUserId = connectionStatus.connected
        ? "current_user"
        : "default_user";
      const success = await disconnectFromDexcom(currentUserId);
      if (success) {
        setConnectionStatus({
          connected: false,
          tokenValid: false,
          expiresAt: null,
        });
      }
    } catch (err) {
      console.error("Disconnection failed:", err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2 px-4 py-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-lg">DiaLog</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Account</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <a
                        href="/settings"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                      >
                        <Database className="w-4 h-4" />
                        Connect Dexcom
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <div className="px-4 py-2 text-xs text-gray-500">© 2024 DiaLog</div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div className="flex flex-1 flex-col gap-6 p-6">
            {/* Connection Status & Actions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      Dexcom Connection
                    </h3>
                    <p className="text-blue-100 text-sm">
                      {connectionStatus.connected
                        ? "Your glucose data is syncing automatically"
                        : "Connect your Dexcom account to start syncing"}
                    </p>
                    {connectionStatus.connected && (
                      <div className="mt-2 text-blue-100 text-sm">
                        <span className="opacity-80">User: </span>
                        <span className="font-medium">default_user</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Status Indicator */}
                <div className="flex items-center justify-center mb-6">
                  <div
                    className={`inline-flex items-center gap-3 px-6 py-3 rounded-full text-sm font-medium ${
                      connectionStatus.connected
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : "bg-red-100 text-red-800 border border-red-200"
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full ${
                        connectionStatus.connected
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                    />
                    {connectionStatus.connected ? "Connected" : "Not Connected"}
                  </div>
                </div>

                {/* User Information */}
                {connectionStatus.connected && (
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-sm text-blue-700">
                        Connected User:
                      </span>
                      <span className="text-sm font-semibold text-blue-800">
                        default_user
                      </span>
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Connection Error:
                      </span>
                      <span className="text-sm">{error}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button
                    onClick={handleConnect}
                    disabled={loading || connectionStatus.connected}
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed px-8 text-white rounded-lg"
                  >
                    <Link className="w-4 h-4 mr-2" />
                    {loading ? "Connecting..." : "Connect to Dexcom"}
                  </Button>

                  <Button
                    onClick={handleDisconnect}
                    disabled={isDisconnecting || !connectionStatus.connected}
                    variant="destructive"
                    size="lg"
                    className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed px-8 text-white rounded-lg"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {isDisconnecting ? "Disconnecting..." : "Disconnect"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Information Section */}
            <div className="grid">
              {/* Technical Details */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <ExternalLink className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Technical Details
                      </h3>
                      <p className="text-amber-100 text-sm">
                        Connection information and status
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* Token Status */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        Token Status
                      </span>
                      <div className="flex items-center gap-2">
                        {connectionStatus.tokenValid ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span
                          className={`text-sm font-medium ${
                            connectionStatus.tokenValid
                              ? "text-green-700"
                              : "text-red-700"
                          }`}
                        >
                          {connectionStatus.tokenValid ? "Valid" : "Invalid"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Expires
                      </span>
                      <span className="text-sm text-gray-900">
                        {connectionStatus.expiresAt ? "Soon" : "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Authorization URL */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        Authorization URL
                      </span>
                    </div>
                    <p className="text-sm text-blue-700 mb-2">
                      Click the Connect button above to generate an
                      authorization URL for Dexcom.
                    </p>
                    <div className="bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-600 font-mono">
                      https://sandbox-api.dexcom.com/v2/oauth2/login?...
                    </div>
                  </div>

                  {/* Authorization Steps */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-2">
                        1
                      </div>
                      <p className="font-medium text-gray-900 text-sm">
                        Click Connect
                      </p>
                      <p className="text-gray-600 text-xs">
                        Start OAuth process
                      </p>
                    </div>

                    <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-2">
                        2
                      </div>
                      <p className="font-medium text-gray-900 text-sm">
                        Authorize Access
                      </p>
                      <p className="text-gray-600 text-xs">Grant permissions</p>
                    </div>

                    <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-2">
                        3
                      </div>
                      <p className="font-medium text-gray-900 text-sm">
                        Start Syncing
                      </p>
                      <p className="text-gray-600 text-xs">Auto-sync data</p>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          Automatic Syncing
                        </span>
                      </div>
                      <p className="text-sm text-green-700">
                        Once connected, your glucose data automatically syncs
                        every few minutes. No manual refresh needed.
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                          Security & Privacy
                        </span>
                      </div>
                      <p className="text-sm text-blue-700">
                        Your Dexcom credentials are encrypted and stored
                        securely. We never have access to your password.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
