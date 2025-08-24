import { useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export function useDexcomConnect() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectToDexcom = async (userId?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Always use the same user ID for consistency
      const consistentUserId = userId || "default_user";

      // Get the authorization URL from backend
      const { data } = await axios.get(
        `${API}/dexcom/connect?user_id=${consistentUserId}`
      );

      if (data.authorization_url) {
        // Redirect to Dexcom OAuth page
        window.location.href = data.authorization_url;
      } else {
        throw new Error("No authorization URL received");
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.detail ||
        err.message ||
        "Failed to connect to Dexcom";
      setError(errorMessage);
      console.error("Dexcom connection error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async (userId: string = "default_user") => {
    try {
      const { data } = await axios.get(`${API}/dexcom/status/${userId}`);
      return data;
    } catch (err: any) {
      console.error("Failed to check connection status:", err);
      return { connected: false, message: "Failed to check status" };
    }
  };

  const disconnectFromDexcom = async (userId: string = "default_user") => {
    try {
      await axios.post(`${API}/dexcom/disconnect/${userId}`);
      return true;
    } catch (err: any) {
      console.error("Failed to disconnect:", err);
      return false;
    }
  };

  return {
    connectToDexcom,
    checkConnectionStatus,
    disconnectFromDexcom,
    loading,
    error,
  };
}
