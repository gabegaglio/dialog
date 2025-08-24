import { useState, useEffect } from "react";
import { Button } from "./button";
import { useDexcomConnect } from "../../hooks/useDexcomConnect";
import { Activity, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface DexcomConnectProps {
  className?: string;
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

export function DexcomConnect({
  className,
  connectionStatus,
  setConnectionStatus,
}: DexcomConnectProps) {
  const { connectToDexcom, disconnectFromDexcom, loading, error } =
    useDexcomConnect();

  const handleConnect = async () => {
    try {
      await connectToDexcom("default_user");
      // The redirect will happen automatically
    } catch (err) {
      console.error("Connection failed:", err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectFromDexcom("default_user");
      // Status will be updated by parent component
    } catch (err) {
      console.error("Disconnect failed:", err);
    }
  };

  if (connectionStatus?.connected && connectionStatus?.tokenValid) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Connected to Dexcom</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  if (connectionStatus?.connected && !connectionStatus?.tokenValid) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2 text-yellow-600">
          <XCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Token Expired</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleConnect}
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          Reconnect
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2 text-gray-600">
        <Activity className="w-4 h-4" />
        <span className="text-sm font-medium">Not connected to Dexcom</span>
      </div>
      <Button
        onClick={handleConnect}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Connecting...
          </>
        ) : (
          "Connect to Dexcom"
        )}
      </Button>
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
