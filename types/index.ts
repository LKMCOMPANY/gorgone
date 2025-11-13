/**
 * Centralized types for Gorgone V2
 * Social media monitoring platform
 */

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user" | "viewer";
  createdAt: Date;
  updatedAt: Date;
}

// Authentication types
export interface AuthSession {
  user: User;
  token: string;
  expiresAt: Date;
}

// Monitoring data types
export interface MonitoringData {
  id: string;
  source: string;
  content: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

// Metrics types
export interface Metrics {
  total: number;
  growth: number;
  period: string;
}

export type ApiResponse<T> = {
  data: T;
  error?: string;
  status: "success" | "error";
};

