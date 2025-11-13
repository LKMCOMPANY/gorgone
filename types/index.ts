/**
 * Centralized types for Gorgone V2
 * Social media monitoring platform
 */

// User roles
export type UserRole = "super_admin" | "admin" | "operator" | "manager";

// Client (Operation) type
export interface Client {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

// Client with user count
export interface ClientWithStats extends Client {
  user_count: number;
}

// Database profile type
export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  organization: string | null;
  client_id: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

// User type (combination of auth.users + profiles)
export interface User {
  id: string;
  email: string;
  role: UserRole;
  organization: string | null;
  client_id: string | null;
  created_at: string;
}

// Client user (user with profile info and client relationship)
export interface ClientUser {
  id: string;
  email: string;
  role: UserRole;
  organization: string | null;
  client_id: string;
  created_at: string;
  updated_at: string;
}

// Authentication types
export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
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
