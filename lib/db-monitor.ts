import * as Sentry from "@sentry/nextjs";

/**
 * Monitors database query performance.
 * Logs execution time and sends data to Sentry if it exceeds the threshold.
 */
export async function monitorQuery<T>(
  queryName: string,
  queryPromise: Promise<T>,
  thresholdMs: number = 1000
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await queryPromise;
    const duration = performance.now() - start;

    if (duration > thresholdMs) {
      console.warn(`[Slow Query Detected] ${queryName} took ${duration.toFixed(2)}ms`);
      
      Sentry.captureMessage(`Slow DB Query: ${queryName}`, {
        level: "warning",
        extra: {
          durationMs: duration,
          thresholdMs,
          query: queryName,
        },
      });
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    Sentry.captureException(error, {
      extra: {
        queryName,
        durationMs: duration,
      },
    });
    throw error;
  }
}
