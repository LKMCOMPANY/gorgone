/**
 * Centralized data layer for Gorgone V2
 * All data access functions go through here
 */

import type { ApiResponse, MonitoringData, Metrics } from "@/types";

// Re-export client management functions
export {
  getAllClients,
  getClientById,
  getClientWithStats,
  createClient,
  updateClient,
  deleteClient,
  hardDeleteClient,
  getClientUsers,
  assignUserToClient,
  removeUserFromClient,
} from "./clients";

// Re-export zone management functions
export {
  getZonesByClient,
  getActiveZonesByClient,
  getZoneById,
  createZone,
  updateZone,
  deleteZone,
  toggleZoneActive,
  updateZoneDataSources,
} from "./zones";

// Re-export Twitter opinion map functions
export * from "./twitter/opinion-map";

/**
 * Fetch monitoring data
 */
export async function getMonitoringData(): Promise<
  ApiResponse<MonitoringData[]>
> {
  try {
    // TODO: Implement fetching logic from Supabase
    return {
      data: [],
      status: "success",
    };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : "Unknown error",
      status: "error",
    };
  }
}

/**
 * Fetch metrics
 */
export async function getMetrics(): Promise<ApiResponse<Metrics>> {
  try {
    // TODO: Implement fetching logic from Redis cache
    return {
      data: {
        total: 0,
        growth: 0,
        period: "24h",
      },
      status: "success",
    };
  } catch (error) {
    return {
      data: { total: 0, growth: 0, period: "24h" },
      error: error instanceof Error ? error.message : "Unknown error",
      status: "error",
    };
  }
}
