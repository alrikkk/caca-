import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UnifiedAuthPage from "../../app/(auth)/login/page";
import * as authContext from "@/lib/auth-context";

vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(),
  formatAuthError: (err: string) => err,
}));

describe("UnifiedAuthPage Component (Login & Signup Flow)", () => {
  const mockSignIn = vi.fn();
  const mockSignUp = vi.fn();
  const mockEnterDemoMode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authContext.useAuth).mockReturnValue({
      user: null,
      profile: null,
      session: null,
      isLoading: false,
      isDemoMode: false,
      signIn: mockSignIn,
      signUp: mockSignUp,
      signOut: vi.fn(),
      enterDemoMode: mockEnterDemoMode,
      exitDemoMode: vi.fn(),
      setProfile: vi.fn(),
      updateProfileState: vi.fn(),
      refreshSession: vi.fn(),
    });
  });

  it("renders email and password inputs and a submit button", () => {
    render(<UnifiedAuthPage />);

    expect(screen.getByText(/EMAIL \/ PHONE/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/student@university.edu/i)).toBeInTheDocument();
    expect(screen.getByText(/PASSWORD/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /CONTINUE/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /TRY DEMO MODE/i })
    ).not.toBeInTheDocument();
  });

  it("displays error message when signUp resolves with an error after submitting", async () => {
    mockSignUp.mockResolvedValue({
      error: "TOO MANY ATTEMPTS. Please wait a little before trying again.",
    });

    render(<UnifiedAuthPage />);

    // Switch to Sign Up mode
    const toggleButton = screen.getByRole("button", {
      name: /NEW TO CACA\? CREATE ACCOUNT →/i,
    });
    fireEvent.click(toggleButton);

    const emailInput = screen.getByPlaceholderText(/student@university.edu/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const submitButton = screen.getByRole("button", { name: /CREATE ACCOUNT/i });

    fireEvent.change(emailInput, { target: { value: "student@stanford.edu" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith("student@stanford.edu", "password123");
      expect(
        screen.getByText("TOO MANY ATTEMPTS. Please wait a little before trying again.")
      ).toBeInTheDocument();
    });
  });

  it("shows disabled loading state on the submit button while authentication is pending", async () => {
    let resolveLogin: (val: any) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    mockSignIn.mockReturnValue(loginPromise);

    render(<UnifiedAuthPage />);

    const emailInput = screen.getByPlaceholderText(/student@university.edu/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const submitButton = screen.getByRole("button", { name: /CONTINUE/i });

    fireEvent.change(emailInput, { target: { value: "student@stanford.edu" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    // Button should be disabled during async operation
    expect(submitButton).toBeDisabled();

    // Resolve login to clean up
    resolveLogin!({ hasProfile: true });
  });
});
