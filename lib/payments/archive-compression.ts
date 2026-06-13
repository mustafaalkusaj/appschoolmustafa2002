import zlib from "zlib";

/**
 * Compressed archive data format:
 * { _c: 1, d: "<base64-gzipped-json>" }
 *
 * Legacy (uncompressed) archives remain fully compatible —
 * they are detected by the absence of the `_c` flag.
 */

type CompressedEnvelope = { _c: 1; d: string };

export function compressArchiveData(data: unknown): CompressedEnvelope {
  const json = JSON.stringify(data);
  const compressed = zlib.gzipSync(Buffer.from(json, "utf8"), { level: 9 });
  return { _c: 1, d: compressed.toString("base64") };
}

export function decompressArchiveData(raw: unknown): unknown {
  if (
    raw !== null &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    (raw as Record<string, unknown>)._c === 1 &&
    typeof (raw as Record<string, unknown>).d === "string"
  ) {
    const buf = Buffer.from((raw as CompressedEnvelope).d, "base64");
    const json = zlib.gunzipSync(buf).toString("utf8");
    return JSON.parse(json);
  }
  // Legacy uncompressed — return as-is
  return raw;
}
