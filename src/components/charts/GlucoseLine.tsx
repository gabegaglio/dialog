import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
} from "recharts";
import { format } from "date-fns";
import { TrendingUp, Activity } from "lucide-react";

type Point = { ts: string; mgdl: number; trend?: string; trendRate?: number };

export default function GlucoseLine({ data, showTargetRange = false }: { data: Point[]; showTargetRange?: boolean }) {
  // Transform data for the chart
  const chartData = data.map((point) => ({
    time: format(new Date(point.ts), "HH:mm"),
    glucose: point.mgdl,
    fullTime: format(new Date(point.ts), "PPpp"),
    trend: point.trend || "stable",
  }));

  // Calculate trend percentage (simple comparison of first vs last)
  const getTrendPercentage = () => {
    if (data.length < 2) return "0";
    const first = data[0]?.mgdl || 0;
    const last = data[data.length - 1]?.mgdl || 0;
    if (first === 0) return "0";
    return (((last - first) / first) * 100).toFixed(1);
  };

  const trendPercentage = getTrendPercentage();
  const isTrendingUp = parseFloat(trendPercentage) > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Glucose Trend
            </h3>
            <p className="text-gray-600 text-sm">
              Real-time glucose monitoring data
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f3f4f6"
              />

              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fill: "#6b7280", fontSize: 12 }}
              />

              <YAxis
                domain={[40, 400]}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fill: "#6b7280", fontSize: 12 }}
                ticks={[55, 100, 200, 300, 400]}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                        <p className="font-medium text-gray-900">
                          {data.fullTime}
                        </p>
                        <p className="text-blue-600 font-semibold">
                          {data.glucose} mg/dL
                        </p>
                        {data.trend && (
                          <p className="text-gray-600 text-sm">
                            Trend: {data.trend}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Target Range Reference Area (70-180 mg/dL) */}
              {showTargetRange && (
                <ReferenceArea
                  y1={70}
                  y2={180}
                  fill="#10b981"
                  fillOpacity={0.1}
                  stroke="#10b981"
                  strokeOpacity={0.3}
                  strokeDasharray="3 3"
                />
              )}

              {/* Red dashed-dotted line at y = 55 (low glucose warning) */}
              <ReferenceArea
                y1={55}
                y2={55}
                stroke="#ef4444"
                strokeOpacity={0.8}
                strokeDasharray="5 5 2 5"
                strokeWidth={2}
              />

              <Line
                type="natural"
                dataKey="glucose"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium text-gray-900">
              {isTrendingUp ? "Trending up" : "Trending down"} by{" "}
              {Math.abs(parseFloat(trendPercentage))}%
              <TrendingUp
                className={`h-4 w-4 ${
                  isTrendingUp ? "text-green-600" : "text-red-600 rotate-180"
                }`}
              />
            </div>
            <div className="text-gray-600 flex items-center gap-2 leading-none">
              {data.length > 0 && data[0]?.ts && data[data.length - 1]?.ts && (
                <>
                  {format(new Date(data[0].ts), "MMM d, yyyy")} -{" "}
                  {format(new Date(data[data.length - 1].ts), "MMM d, yyyy")}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
