export async function streamGradeAnalysis(
  _params: Record<string, unknown>,
): Promise<ReadableStream> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("AI analysis not implemented yet."));
      controller.close();
    },
  });
}
