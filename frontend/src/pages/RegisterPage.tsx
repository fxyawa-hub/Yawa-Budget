import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Mail, User, Sun, Moon } from "lucide-react";
import { Input } from "../components/common/Input";
import { Button } from "../components/common/Button";
import { ErrorAlert } from "../components/common/ErrorAlert";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getErrorMessage } from "../api";

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed. Please try again."));
    } finally {
      setIsLoading(false);
    }
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
          Create account
        </h1>
        <p className="mt-1 text-xs font-mono text-[var(--text-muted)]">
          record expenditures and track monthly limits
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 sm:p-8">
          {error && <ErrorAlert message={error} className="mb-4" />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="register-name-input"
              label="Full name (optional)"
              type="text"
              placeholder="e.g. Alex Morgan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftIcon={<User className="w-3.5 h-3.5" />}
            />

            <Input
              id="register-email-input"
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
              id="register-password-input"
              label="Password (min 6 characters)"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-3.5 h-3.5" />}
              autoComplete="new-password"
              required
            />

            <Input
              id="register-confirm-password-input"
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Lock className="w-3.5 h-3.5" />}
              autoComplete="new-password"
              required
            />

            <div className="pt-2">
              <Button
                id="register-submit-btn"
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
              >
                Create account
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center text-xs font-sans text-[var(--text-secondary)]">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-[var(--text-primary)] underline hover:text-[var(--accent-lime-hover)] transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
