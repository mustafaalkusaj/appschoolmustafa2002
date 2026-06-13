import { describe, expect, it } from "vitest";

import {
  forgotPasswordRequestSchema,
  loginRequestSchema,
} from "@/lib/api-schemas";

// ── loginRequestSchema ────────────────────────────────────────────────────────

describe("loginRequestSchema", () => {
  it("accepts a valid email and password of 8+ chars", () => {
    const result = loginRequestSchema.safeParse({
      email: "user@school.com",
      password: "password",
    });
    expect(result.success).toBe(true);
  });

  it("lowercases the email on success", () => {
    const result = loginRequestSchema.safeParse({
      email: "Admin@SCHOOL.COM",
      password: "password1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("admin@school.com");
    }
  });

  it("accepts a password of exactly 8 characters", () => {
    const result = loginRequestSchema.safeParse({
      email: "user@school.com",
      password: "12345678",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email like 'not-an-email'", () => {
    const result = loginRequestSchema.safeParse({
      email: "not-an-email",
      password: "password1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a short password shorter than 8 chars ('short')", () => {
    const result = loginRequestSchema.safeParse({
      email: "user@school.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty email", () => {
    const result = loginRequestSchema.safeParse({
      email: "",
      password: "password1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = loginRequestSchema.safeParse({
      email: "user@school.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing email field", () => {
    const result = loginRequestSchema.safeParse({
      password: "password1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing password field", () => {
    const result = loginRequestSchema.safeParse({
      email: "user@school.com",
    });
    expect(result.success).toBe(false);
  });
});

// ── forgotPasswordRequestSchema ───────────────────────────────────────────────

describe("forgotPasswordRequestSchema", () => {
  it("accepts a valid email and defaults locale to 'ar'", () => {
    const result = forgotPasswordRequestSchema.safeParse({
      email: "user@school.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@school.com");
      expect(result.data.locale).toBe("ar");
    }
  });

  it("accepts a valid email with explicit locale 'en'", () => {
    const result = forgotPasswordRequestSchema.safeParse({
      email: "teacher@school.com",
      locale: "en",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.locale).toBe("en");
    }
  });

  it("trims and lowercases the email", () => {
    const result = forgotPasswordRequestSchema.safeParse({
      email: "  Admin@School.COM  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("admin@school.com");
    }
  });

  it("rejects an invalid email", () => {
    const result = forgotPasswordRequestSchema.safeParse({
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty email string", () => {
    const result = forgotPasswordRequestSchema.safeParse({
      email: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid locale value", () => {
    const result = forgotPasswordRequestSchema.safeParse({
      email: "user@school.com",
      locale: "fr",
    });
    expect(result.success).toBe(false);
  });
});
