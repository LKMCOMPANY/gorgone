/**
 * Centralized logging utility
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogData {
  message: string;
  level: LogLevel;
  timestamp: string;
  data?: Record<string, unknown>;
}

class Logger {
  private formatLog(level: LogLevel, message: string, data?: unknown): LogData {
    return {
      message,
      level,
      timestamp: new Date().toISOString(),
      ...(data && typeof data === "object"
        ? { data: data as Record<string, unknown> }
        : {}),
    };
  }

  info(message: string, data?: unknown) {
    const log = this.formatLog("info", message, data);
    console.info(`[INFO] ${log.message}`, log.data || "");
  }

  warn(message: string, data?: unknown) {
    const log = this.formatLog("warn", message, data);
    console.warn(`[WARN] ${log.message}`, log.data || "");
  }

  error(message: string, error?: unknown) {
    const log = this.formatLog("error", message, error);
    console.error(`[ERROR] ${log.message}`, log.data || "");

    // In production, send to error tracking service (Sentry, etc.)
    if (process.env.NODE_ENV === "production") {
      // TODO: Implement error tracking
    }
  }

  debug(message: string, data?: unknown) {
    if (process.env.NODE_ENV !== "production") {
      const log = this.formatLog("debug", message, data);
      console.debug(`[DEBUG] ${log.message}`, log.data || "");
    }
  }
}

export const logger = new Logger();
