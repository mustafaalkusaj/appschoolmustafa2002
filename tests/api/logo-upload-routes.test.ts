import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  resolveSchoolScopedActorContext: vi.fn(),
  uploadLogoToStorage: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/managed-users-server", () => ({
  resolveSchoolScopedActorContext: mockState.resolveSchoolScopedActorContext,
}));
vi.mock("@/lib/logo-upload-server", () => ({
  uploadLogoToStorage: mockState.uploadLogoToStorage,
}));

const VALID_PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

function makeRequest(url: string, file?: File, schoolId = "school-1") {
  const formData = new FormData();
  formData.set("school_id", schoolId);
  if (file) {
    formData.set("file", file);
  }

  return new NextRequest(`http://localhost${url}`, {
    method: "POST",
    body: formData,
  });
}

describe("logo upload routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.resolveSchoolScopedActorContext.mockResolvedValue({
      ok: true,
      value: {
        targetSchoolId: "school-1",
      },
    });
    mockState.uploadLogoToStorage.mockResolvedValue("https://cdn.example.com/logo.png");
  });

  it("rejects school logo uploads whose content does not match declared PNG type", async () => {
    const { POST } = await import("@/app/api/web/dashboard/branding/logo/route");
    const fakePng = new File([new TextEncoder().encode("not-a-png")], "fake.png", {
      type: "image/png",
    });

    const response = await POST(makeRequest("/api/web/dashboard/branding/logo", fakePng));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("MAGIC_MISMATCH");
    expect(mockState.uploadLogoToStorage).not.toHaveBeenCalled();
  });

  it("rejects oversized school logo uploads", async () => {
    const { POST } = await import("@/app/api/web/dashboard/branding/logo/route");
    const tooLarge = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png", {
      type: "image/png",
    });

    const response = await POST(makeRequest("/api/web/dashboard/branding/logo", tooLarge));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("TOO_LARGE");
    expect(mockState.uploadLogoToStorage).not.toHaveBeenCalled();
  });

  it("rejects unsupported school logo mime types with HTTP 400 instead of 500", async () => {
    const { POST } = await import("@/app/api/web/dashboard/branding/logo/route");
    const textFile = new File([new TextEncoder().encode("plain-text")], "bad.txt", {
      type: "text/plain",
    });

    const response = await POST(makeRequest("/api/web/dashboard/branding/logo", textFile));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("BAD_MIME");
    expect(payload.error.message).toMatch(/نوع الملف غير مدعوم|PNG|JPEG|WebP/i);
    expect(mockState.uploadLogoToStorage).not.toHaveBeenCalled();
  });

  it("accepts valid school logo uploads and returns the uploaded URL", async () => {
    const { POST } = await import("@/app/api/web/dashboard/branding/logo/route");
    const png = new File([VALID_PNG_BYTES], "logo.png", { type: "image/png" });

    const response = await POST(makeRequest("/api/web/dashboard/branding/logo", png));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.url).toBe("https://cdn.example.com/logo.png");
    expect(mockState.uploadLogoToStorage).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: "school-logos",
        objectPrefix: "logo",
        schoolScope: "school-1",
      }),
    );
  });

  it("uses the branch bucket for valid branch logo uploads", async () => {
    const { POST } = await import("@/app/api/web/super-admin/branches/logo/route");
    const png = new File([VALID_PNG_BYTES], "branch.png", { type: "image/png" });

    const response = await POST(makeRequest("/api/web/super-admin/branches/logo", png));

    expect(response.status).toBe(200);
    expect(mockState.uploadLogoToStorage).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: "branch-logos",
        objectPrefix: "branch_logo",
        schoolScope: "school-1",
      }),
    );
  });
});
