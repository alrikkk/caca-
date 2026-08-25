import { describe, it, expect } from "vitest";
import { formatAuthError } from "../../lib/auth-context";

describe("formatAuthError (Pure Authentication Error Formatter)", () => {
  it("maps Supabase rate limit errors to user-friendly alert message", () => {
    const error1 = formatAuthError("over_email_send_rate_limit");
    expect(error1).toBe("TOO MANY ATTEMPTS. Please wait a little before trying again.");

    const error2 = formatAuthError("Too Many Requests: rate_limit_exceeded");
    expect(error2).toBe("TOO MANY ATTEMPTS. Please wait a little before trying again.");
  });

  it("maps invalid credential errors to actionable login guidance", () => {
    const error1 = formatAuthError("Invalid login credentials");
    expect(error1).toBe("INVALID EMAIL OR PASSWORD. Please check your credentials or create an account.");

    const error2 = formatAuthError("invalid_grant: Invalid username or password");
    expect(error2).toBe("INVALID EMAIL OR PASSWORD. Please check your credentials or create an account.");
  });

  it("maps duplicate user signup attempts to account existence warning", () => {
    const error = formatAuthError("User already registered with this email");
    expect(error).toBe("ACCOUNT ALREADY EXISTS. Please enter your password to log in.");
  });

  it("maps unconfirmed email errors accurately", () => {
    const error = formatAuthError("Email not confirmed");
    expect(error).toBe("EMAIL NOT CONFIRMED. Please verify your email before logging in.");
  });

  it("maps short password constraint errors", () => {
    const error = formatAuthError("Password should be at least 6 characters");
    expect(error).toBe("PASSWORD TOO SHORT. Must be at least 6 characters.");
  });

  it("maps network connectivity failures", () => {
    const error = formatAuthError("Failed to fetch: Network error occurred");
    expect(error).toBe("NETWORK CONNECTION ISSUE. Please check your connection and try again.");
  });

  it("preserves unmapped custom error messages verbatim", () => {
    const customMessage = "Custom database error occurred.";
    expect(formatAuthError(customMessage)).toBe(customMessage);
  });
});
