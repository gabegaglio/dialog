import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const state = urlParams.get("state");
      const error = urlParams.get("error");

      if (error) {
        // Handle authorization error
        console.error("Dexcom authorization error:", error);
        navigate("/?dexcom=error&message=Authorization denied by user");
        return;
      }

      if (!code || !state) {
        // Missing required parameters
        console.error("Missing OAuth parameters:", { code, state });
        navigate("/?dexcom=error&message=Invalid callback parameters");
        return;
      }

      try {
        console.log("🔄 Processing OAuth callback with code and state");
        console.log("Code:", code ? code.substring(0, 20) + "..." : "None");
        console.log("State:", state ? state.substring(0, 20) + "..." : "None");

        // Call the backend to exchange the authorization code for tokens
        const response = await fetch(
          `http://localhost:8000/dexcom/exchange-token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code: code,
              state: state,
              // Let the backend determine the real Dexcom username
              user_id: "temp_user",
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          console.log("✅ Token exchange successful:", result);
          // Use the actual Dexcom user ID returned from the backend
          const dexcom_user_id = result.user_id || "default_user";
          navigate("/?dexcom=success&user_id=" + dexcom_user_id);
        } else {
          const errorData = await response.json();
          console.error("❌ Token exchange failed:", errorData);
          navigate(
            "/?dexcom=error&message=Failed to exchange authorization code"
          );
        }
      } catch (err) {
        console.error("Callback processing error:", err);
        navigate("/?dexcom=error&message=Failed to process callback");
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Completing Dexcom Connection
        </h2>
        <p className="text-gray-600">
          Please wait while we complete your authentication...
        </p>
      </div>
    </div>
  );
}
