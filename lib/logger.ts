/**
 * Comprehensive Logging System
 * Logs all API requests, errors, and critical operations
 * Structured logging with levels: DEBUG, INFO, WARN, ERROR
 */

import { appendFileSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
  };
  userId?: string;
  ip?: string;
  endpoint?: string;
  duration?: number; // ms
}

/**
 * Logger class for comprehensive logging
 */
export class Logger {
  private logsDir: string;
  private isDevelopment: boolean;

  constructor(logsDir = "logs") {
    this.logsDir = logsDir;
    this.isDevelopment = process.env.NODE_ENV !== "production";

    // Create logs directory if it doesn't exist
    try {
      mkdirSync(this.logsDir, { recursive: true });
    } catch {
      // Directory might already exist
    }
  }

  /**
   * Write log entry
   */
  private writeLog(entry: LogEntry) {
    const logContent = JSON.stringify(entry);

    // Console output in development
    if (this.isDevelopment) {
      const levelColor = {
        DEBUG: "\x1b[36m", // cyan
        INFO: "\x1b[32m", // green
        WARN: "\x1b[33m", // yellow
        ERROR: "\x1b[31m", // red
      };

      const reset = "\x1b[0m";
      const color = levelColor[entry.level];

      console.log(
        `${color}[${entry.timestamp}] ${entry.level}${reset} ${entry.message}`
      );

      if (entry.context) {
        console.log("Context:", entry.context);
      }
      if (entry.error) {
        console.error("Error:", entry.error.message);
        if (entry.error.stack) console.error("Stack:", entry.error.stack);
      }
    }

    // File logging (always)
    try {
      const logFile = join(this.logsDir, `app.log`);
      appendFileSync(logFile, logContent + "\n");

      // Also write errors to separate file
      if (entry.level === "ERROR") {
        const errorFile = join(this.logsDir, `errors.log`);
        appendFileSync(errorFile, logContent + "\n");
      }
    } catch (e) {
      // Log file write failed - don't crash the app
      if (this.isDevelopment) {
        console.error("Failed to write log:", e);
      }
    }
  }

  /**
   * Get current timestamp
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: Record<string, unknown>) {
    this.writeLog({
      timestamp: this.getTimestamp(),
      level: "DEBUG",
      message,
      context,
    });
  }

  /**
   * Info level logging
   */
  info(message: string, context?: Record<string, unknown>) {
    this.writeLog({
      timestamp: this.getTimestamp(),
      level: "INFO",
      message,
      context,
    });
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: Record<string, unknown>) {
    this.writeLog({
      timestamp: this.getTimestamp(),
      level: "WARN",
      message,
      context,
    });
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.writeLog({
      timestamp: this.getTimestamp(),
      level: "ERROR",
      message,
      context,
      error: error ? {
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
  }

  /**
   * Log API request
   */
  logApiRequest(
    endpoint: string,
    method: string,
    userId?: string,
    ip?: string
  ) {
    this.info(`API Request: ${method} ${endpoint}`, {
      endpoint,
      method,
      userId,
      ip,
    });
  }

  /**
   * Log API response
   */
  logApiResponse(
    endpoint: string,
    status: number,
    duration: number,
    userId?: string
  ) {
    const level = status >= 400 ? "WARN" : "INFO";
    const message = `API Response: ${endpoint} - ${status}`;

    if (level === "WARN") {
      this.warn(message, {
        endpoint,
        status,
        duration,
        userId,
      });
    } else {
      this.info(message, {
        endpoint,
        status,
        duration,
        userId,
      });
    }
  }

  /**
   * Log database operation
   */
  logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    userId?: string
  ) {
    this.debug(`Database: ${operation} on ${table}`, {
      operation,
      table,
      duration,
      userId,
    });
  }

  /**
   * Log authentication event
   */
  logAuthEvent(
    event: "login" | "logout" | "failed_login" | "permission_denied",
    userId?: string,
    ip?: string,
    reason?: string
  ) {
    const level = event.startsWith("failed") ? "WARN" : "INFO";
    const message = `Auth Event: ${event}`;

    if (level === "WARN") {
      this.warn(message, { userId, ip, reason });
    } else {
      this.info(message, { userId, ip });
    }
  }

  /**
   * Log data modification
   */
  logDataModification(
    action: "create" | "update" | "delete",
    table: string,
    recordId: string,
    userId: string,
    changes?: Record<string, unknown>
  ) {
    this.info(`Data: ${action} on ${table}/${recordId}`, {
      action,
      table,
      recordId,
      userId,
      changes,
    });
  }

  /**
   * Get logs for analysis
   */
  getLogs(filter?: { level?: LogLevel; limit?: number }): LogEntry[] {
    try {
      const logFile = join(this.logsDir, `app.log`);
      const content = readFileSync(logFile, "utf-8");
      const logs = content
        .split("\n")
        .filter((line: string) => line.trim())
        .map((line: string) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter((log: LogEntry | null) => {
          if (!log) return false;
          if (filter?.level && log.level !== filter.level) return false;
          return true;
        });

      return logs.slice(-(filter?.limit || 100));
    } catch {
      return [];
    }
  }
}

// Export singleton instance
export const logger = new Logger();

/**
 * Middleware for logging API requests/responses
 */
export async function apiLoggingMiddleware(
  req: { method: string; nextUrl: { pathname: string }; ip?: string },
  handler: () => Promise<{ status?: number }>,
  userId?: string
) {
  const startTime = Date.now();
  const method = req.method;
  const endpoint = req.nextUrl.pathname;
  const ip = req.ip;

  logger.logApiRequest(endpoint, method, userId, ip);

  try {
    const response = await handler();
    const duration = Date.now() - startTime;
    const status = response.status || 200;

    logger.logApiResponse(endpoint, status, duration, userId);
    return response;
  } catch (error) {
    logger.error(
      `API Error: ${method} ${endpoint}`,
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}
