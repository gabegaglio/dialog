import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

const API = import.meta.env.VITE_API_BASE || "http://localhost:8000";

interface GlucosePoint {
  ts: string;
  mgdl: number;
  trend?: string;
  trendRate?: number;
}

interface GlucoseResponse {
  source: "dexcom" | "real_csv" | "synthetic" | "none";
  data: GlucosePoint[];
  range: string;
  message?: string;
}

// Cache for storing data by range
const dataCache = new Map<string, GlucoseResponse>();

export function useGlucoseQuery({
  range,
}: {
  range: "3h" | "6h" | "12h" | "24h";
}) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["glucose", range],
    queryFn: async (): Promise<GlucoseResponse> => {
      const { data } = await axios.get(`${API}/glucose`, { params: { range } });

      // Cache the data
      dataCache.set(range, data);

      return data;
    },
    // Use cached data immediately if available for the exact same range
    initialData: () => {
      const cached = dataCache.get(range);
      return cached || undefined;
    },
    // Keep data fresh for 2 minutes (shorter to ensure different ranges get fresh data)
    staleTime: 2 * 60 * 1000,
    // Keep data in cache for 5 minutes
    gcTime: 5 * 60 * 1000,
    // Refetch in background when data becomes stale
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  });
}

// Helper hook to get just the glucose data array
export function useGlucoseData({
  range,
}: {
  range: "3h" | "6h" | "12h" | "24h";
}) {
  const query = useGlucoseQuery({ range });

  return {
    ...query,
    data: query.data?.data || [],
    dataSource: query.data?.source || "none",
  };
}

// Prefetch function to load data for all ranges in the background
export function usePrefetchGlucoseData() {
  const queryClient = useQueryClient();

  const prefetchAll = () => {
    const ranges: ("3h" | "6h" | "12h" | "24h")[] = ["3h", "6h", "12h", "24h"];

    ranges.forEach((range) => {
      queryClient.prefetchQuery({
        queryKey: ["glucose", range],
        queryFn: async (): Promise<GlucoseResponse> => {
          const { data } = await axios.get(`${API}/glucose`, {
            params: { range },
          });
          dataCache.set(range, data);
          return data;
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      });
    });
  };

  return { prefetchAll };
}
