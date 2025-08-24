import { useState, useEffect, useCallback } from "react";
import {
  useGlucoseData,
  usePrefetchGlucoseData,
} from "../hooks/useGlucoseQuery";
import GlucoseLine from "../components/charts/GlucoseLine";
import {
  TrendingUp,
  Database,
  AlertCircle,
  BarChart3,
  Clock,
  Zap,
  Target,
} from "lucide-react";

export default function Trends() {
  const [selectedRange, setSelectedRange] = useState<
    "3h" | "6h" | "12h" | "24h"
  >("24h");

  const { data, isLoading, error, dataSource, isFetching } = useGlucoseData({
    range: selectedRange,
  });

  // Prefetch all ranges for seamless transitions
  const { prefetchAll } = usePrefetchGlucoseData();

  // Use useCallback to prevent infinite re-renders
  const handlePrefetch = useCallback(() => {
    prefetchAll();
  }, [prefetchAll]);

  useEffect(() => {
    // Prefetch all ranges when component mounts (only once)
    handlePrefetch();
  }, [handlePrefetch]);

  const timeRanges = [
    { value: "3h", label: "3 Hours", icon: Clock },
    { value: "6h", label: "6 Hours", icon: Clock },
    { value: "12h", label: "12 Hours", icon: Clock },
    { value: "24h", label: "24 Hours", icon: Clock },
  ];

  // Show cached data immediately, only show loading for initial load
  const showLoading = isLoading && !data.length;
  const showRefetching = isFetching && data.length > 0;

  if (error)
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">Failed to load glucose data</p>
        <p className="text-red-600 text-sm mt-1">Please try again later</p>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Trends & Analysis
          </h1>
          <p className="text-gray-600 mt-1 font-medium">
            Analyze your glucose patterns over different time periods
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

          {/* Show refetching indicator */}
          {showRefetching && (
            <div className="px-3 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              Updating...
            </div>
          )}
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

      {dataSource === "real_csv" && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div>
              <h3 className="text-blue-800 font-medium">Real Glucose Data</h3>
              <p className="text-blue-700 text-sm mt-1">
                You're viewing real glucose data from your Dexcom G6 export.
                This shows your actual blood sugar readings over time.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Time Range Selector - Compact Filter */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Time Range:</span>
          <div className="flex gap-1">
            {timeRanges.map((range) => {
              const isSelected = selectedRange === range.value;
              const IconComponent = range.icon;

              return (
                <button
                  key={range.value}
                  onClick={() =>
                    setSelectedRange(range.value as "3h" | "6h" | "12h" | "24h")
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

      {/* Chart Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Glucose Trend Analysis
          </h2>
          <p className="text-gray-600 text-sm">
            {selectedRange === "3h" &&
              "Recent glucose fluctuations and patterns"}
            {selectedRange === "6h" && "Half-day glucose trends and variations"}
            {selectedRange === "12h" && "Daily glucose patterns and cycles"}
            {selectedRange === "24h" && "Full day glucose overview and trends"}
          </p>
        </div>
        <div className="p-6">
          {showLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <GlucoseLine data={data} />
          )}
        </div>
      </div>

      {/* Data Insights */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Data Insights</h2>
          <p className="text-gray-600 text-sm">Summary of your glucose data</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {data.length}
              </div>
              <div className="text-sm text-gray-600">Data Points</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {dataSource === "dexcom"
                  ? "Live"
                  : dataSource === "real_csv"
                  ? "Real"
                  : "Demo"}
              </div>
              <div className="text-sm text-gray-600">Data Source</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {selectedRange}
              </div>
              <div className="text-sm text-gray-600">Time Range</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {data.length > 0
                  ? Math.round(
                      data.reduce((sum, point) => sum + point.mgdl, 0) /
                        data.length
                    )
                  : "--"}
              </div>
              <div className="text-sm text-gray-600">Average (mg/dL)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
