/**
 * API Logger Utility
 * Provides consistent logging interface for all API routes
 * Tracks request/response cycle with timing and error details
 */

import { logger } from "./logger";

interface ApiLoggerConfig {
  endpoint: string;
  userId?: string;
  ip?: string;
}

/**
 * Create an API logger instance for a specific route
 * Usage: const log = createApiLogger("/api/endpoint/path");
 */
export function createApiLogger(config: ApiLoggerConfig) {
  const { endpoint, userId, ip } = config;
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  return {
    requestId,

    /**
     * Log incoming API request
     */
    logRequest(method: string, additionalContext?: Record<string, unknown>) {
      logger.logApiRequest(endpoint, method, userId, ip);
      if (additionalContext) {
        logger.debug(`Request to ${endpoint}`, {
          endpoint,
          method,
          requestId,
          ...additionalContext
        });
      }
    },

    /**
     * Log successful API response
     */
    logResponse(status: number, additionalContext?: Record<string, unknown>) {
      const duration = Date.now() - startTime;
      logger.logApiResponse(endpoint, status, duration, userId);
      if (status >= 400) {
        logger.warn(`API warning: ${endpoint} returned ${status}`, {
          endpoint,
          status,
          duration,
          requestId,
          ...additionalContext
        });
      }
    },

    /**
     * Log API errors
     */
    logError(
      error: Error,
      context?: Record<string, unknown>
    ) {
      logger.error(`API Error: ${endpoint}`, error, {
        requestId,
        endpoint,
        userId,
        ip,
        ...context
      });
    },

    /**
     * Log data modifications (create, update, delete)
     */
    logDataModification(
      action: "create" | "update" | "delete",
      table: string,
      recordId: string,
      changes?: Record<string, unknown>
    ) {
      logger.logDataModification(action, table, recordId, userId || "anonymous", changes);
    },

    /**
     * Log database operation
     */
    logDatabaseOperation(
      operation: string,
      table: string,
      additionalContext?: Record<string, unknown>
    ) {
      const duration = Date.now() - startTime;
      logger.logDatabaseOperation(operation, table, duration, userId);
      if (additionalContext) {
        logger.debug(`Database operation: ${operation} on ${table}`, additionalContext);
      }
    },

    /**
     * Log authentication event
     */
    logAuthEvent(
      event: "login" | "logout" | "failed_login" | "permission_denied",
      reason?: string
    ) {
      logger.logAuthEvent(event, userId, ip, reason);
    },

    /**
     * Get elapsed time since request started
     */
    getElapsedTime(): number {
      return Date.now() - startTime;
    }
  };
}

/**
 * Middleware for automatic API logging
 * Wraps handler function and logs all requests/responses
 */
export async function withApiLogging<T>(
  endpoint: string,
  handler: (log: ReturnType<typeof createApiLogger>) => Promise<T>,
  config?: {
    userId?: string;
    ip?: string;
  }
): Promise<T> {
  const log = createApiLogger({
    endpoint,
    userId: config?.userId,
    ip: config?.ip
  });

  try {
    return await handler(log);
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { endpoint }
    );
    throw error;
  }
}
