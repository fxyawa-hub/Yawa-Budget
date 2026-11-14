import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Lock, Mail, AlertCircle, Sun, Moon, Loader2 } from "lucide-react";
import { Input } from "../components/common/Input";
import { Button } from "../components/common/Button";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  getErrorMessage,
  IS_DEMO_MODE,
  useServerWakeStatus,
  SERVER_WAKING_MESSAGE,
} from "../api";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isWaking = useServerWakeStatus();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchParams = new URLSearchParams(location.search);
  const sessionExpired = searchParams.get("sessionExpired") === "true";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      await login({ email: email.trim(), password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to log in. Please check your credentials."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail("demo@yawabudget.app");
    setPassword("password123");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Theme toggle in top corner */}
      <div className="absolute top-6 right-6">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="w-8 h-8 flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xs transition-colors"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-[var(--accent-lime)]" /> : <Moon className="w-4 h-4 text-[var(--text-secondary)]" />}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-sm text-center">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] font-sans">
          Yawa Budget
        </h1>
        <p className="mt-1 text-xs font-mono text-[var(--text-muted)]">
          keeps your finances from becoming yawa
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 sm:p-8">
          {sessionExpired && (
            <div className="mb-4 p-3 border border-[var(--alert-red)] bg-[var(--alert-red-subtle)] text-xs text-[var(--alert-red)] flex items-center gap-2 font-sans">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Your session has expired. Please sign in again.</span>
            </div>
          )}

          {error && <ErrorAlert message={error} className="mb-4" />}

          {isLoading && isWaking && (
            <div
              className="mb-4 p-3 border border-[var(--border-color)] bg-[var(--bg-base)] text-xs font-mono text-[var(--text-secondary)] flex items-center gap-2"
              role="status"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>{SERVER_WAKING_MESSAGE}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="login-email-input"
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-3.5 h-3.5" />}
              autoComplete="email"
              required
            />

            <Input
              id="login-password-input"
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-3.5 h-3.5" />}
              autoComplete="current-password"
              required
            />

            <div className="pt-2">
              <Button
                id="login-submit-btn"
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
              >
                Sign in
              </Button>
            </div>
          </form>

          {IS_DEMO_MODE && (
            <div className="mt-6 pt-5 border-t border-[var(--border-color)]">
              <Button
                id="fill-demo-credentials-btn"
                type="button"
                variant="outline"
                size="sm"
                className="w-full font-mono text-xs"
                onClick={handleFillDemo}
              >
                Fill demo credentials
              </Button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-xs font-sans text-[var(--text-secondary)]">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="text-[var(--text-primary)] underline hover:text-[var(--accent-lime-hover)] transition-colors"
          >
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
};
