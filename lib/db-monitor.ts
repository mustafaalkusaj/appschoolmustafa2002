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
      console.warn(`[Slow Query] ${queryName} took ${duration.toFixed(2)}ms (threshold: ${thresholdMs}ms)`);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[Query Error] ${queryName} failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}
