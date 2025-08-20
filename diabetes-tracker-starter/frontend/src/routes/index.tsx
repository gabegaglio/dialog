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
} from "lucide-react";
import { useEffect } from "react";

export default function Dashboard() {
  const { data, isLoading, error, dataSource, isFetching } = useGlucoseData({
    range: "24h",
  });

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
  const previousGlucose =
    data && data.length > 1 ? data[data.length - 2]?.mgdl : null;

  // Calculate trend
  const getTrendInfo = () => {
    if (!currentGlucose || !previousGlucose)
      return { direction: "stable", percentage: 0, color: "text-gray-600" };

    const change = currentGlucose - previousGlucose;
    const percentage = Math.abs((change / previousGlucose) * 100).toFixed(1);

    if (change > 0)
      return { direction: "up", percentage, color: "text-red-600" };
    if (change < 0)
      return { direction: "down", percentage, color: "text-green-600" };
    return { direction: "stable", percentage: 0, color: "text-gray-600" };
  };

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

  const trendInfo = getTrendInfo();
  const glucoseStatus = currentGlucose
    ? getGlucoseStatus(currentGlucose)
    : null;
  const timeSinceLast = getTimeSinceLastReading();
  const StatusIcon = glucoseStatus?.icon || Target;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1 font-medium">
            Monitor your glucose levels and trends
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
              dataSource === "dexcom"
                ? "bg-green-100 text-green-800 border border-green-200"
                : dataSource === "real_csv"
                ? "bg-blue-100 text-blue-800 border border-blue-200"
                : "bg-amber-100 text-amber-800 border border-amber-200"
            }`}
          >
            <Database className="w-4 h-4" />
            {dataSource === "dexcom"
              ? "Live Dexcom"
              : dataSource === "real_csv"
              ? "Real Data"
              : "Synthetic Data"}
          </div>
        </div>
      </div>

      {/* Safety Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div>
            <h3 className="text-amber-800 font-medium text-sm">Medical Disclaimer</h3>
            <p className="text-amber-700 text-sm mt-1">
              This dashboard is for informational purposes only. Never make medical decisions based solely on this data. 
              Always consult your healthcare provider for medical advice, medication changes, or treatment plans.
            </p>
          </div>
        </div>
      </div>

      {/* Current Glucose Level - Light & Concise Design */}
      <div className="space-y-4">
        {/* Main glucose card */}
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

            {/* Status badge */}
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

              {/* 24h Average */}
              {data && data.length > 0 && (
                <div className="text-right">
                  <div className="text-xs text-gray-600 mb-1">24h Avg</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(
                      data.reduce((sum, reading) => sum + reading.mgdl, 0) /
                        data.length
                    )}
                  </div>
                </div>
              )}
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

        {/* Secondary info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  trendInfo.direction === "up"
                    ? "bg-red-100 text-red-800"
                    : trendInfo.direction === "down"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {trendInfo.direction === "up"
                  ? "↗"
                  : trendInfo.direction === "down"
                  ? "↘"
                  : "→"}
                {trendInfo.direction !== "stable" &&
                  ` ${trendInfo.percentage}%`}
              </div>
            </div>
            <div className="text-xl font-bold text-gray-900">
              {trendInfo.direction === "up"
                ? "Rising"
                : trendInfo.direction === "down"
                ? "Falling"
                : "Stable"}
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
      </div>

      {/* Data Source Alert */}
      {dataSource === "synthetic" && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div>
              <h3 className="text-amber-800 font-medium">Using Demo Data</h3>
              <p className="text-amber-700 text-sm mt-1">
                You're currently viewing synthetic data for demonstration
                purposes.{" "}
                <a
                  href="/settings"
                  className="text-blue-600 hover:text-blue-700 font-medium underline"
                >
                  Connect to Dexcom
                </a>{" "}
                to see your real glucose readings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chart Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            24-Hour Glucose Trend
          </h2>
        </div>
        <div className="p-6">
          <GlucoseLine data={data ?? []} />
        </div>
      </div>

      {/* Enhanced Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Data Points</p>
              <p className="text-2xl font-bold text-gray-900">
                {data ? data.length : 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <p className="text-2xl font-bold text-gray-900">
                {dataSource === "dexcom"
                  ? "Live"
                  : dataSource === "real_csv"
                  ? "Real"
                  : "Demo"}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Range</p>
              <p className="text-2xl font-bold text-gray-900">24h</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Zone</p>
              <p
                className={`text-2xl font-bold ${
                  glucoseStatus?.color || "text-gray-900"
                }`}
              >
                {glucoseStatus?.status || "--"}
              </p>
            </div>
            <div
              className={`w-12 h-12 ${
                glucoseStatus?.bgColor || "bg-gray-100"
              } rounded-lg flex items-center justify-center`}
            >
              <StatusIcon
                className={`w-6 h-6 ${glucoseStatus?.color || "text-gray-600"}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
