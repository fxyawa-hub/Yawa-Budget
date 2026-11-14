import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  MessageSquare,
  Settings,
  LogOut,
  Sun,
  Moon,
  Loader2,
  ArrowLeftRight,
} from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useServerWakeStatus, SERVER_WAKING_MESSAGE, IS_DEMO_MODE } from "../../api";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isWaking = useServerWakeStatus();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", shortLabel: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    { label: "Transactions", shortLabel: "Transactions", to: "/transactions", icon: Receipt },
    { label: "Budgets", shortLabel: "Budgets", to: "/budgets", icon: PieChart },
    ...(IS_DEMO_MODE
      ? [{ label: "Transfers", shortLabel: "Transfers", to: "/transfers", icon: ArrowLeftRight }]
      : []),
    { label: "Ask Yawa Budget", shortLabel: "Ask", to: "/ask", icon: MessageSquare },
    { label: "Settings", shortLabel: "Settings", to: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg-surface)] border-b border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <NavLink to="/dashboard" className="flex items-center gap-2">
                <span className="font-sans text-base font-bold tracking-tight text-[var(--text-primary)]">
                  Yawa Budget
                </span>
              </NavLink>
            </div>

            {/* Desktop Navigation with Single Sliding Lime Indicator */}
            <nav className="hidden md:flex items-center relative gap-0.5 p-0.5 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-md">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`relative z-10 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-sans transition-colors rounded-sm select-none ${
                      isActive
                        ? "text-[var(--accent-lime-text)] font-semibold"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>

                    {/* Single continuous sliding lime indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="desktop-nav-indicator"
                        className="absolute inset-0 z-[-1] bg-[var(--accent-lime)] rounded-sm"
                        transition={{ type: "spring", stiffness: 500, damping: 38 }}
                      />
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* Actions: Theme Toggle (Sun/Moon icon, no label) + Logout */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                aria-label="Toggle theme"
                className="w-8 h-8 flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md transition-colors"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 text-[var(--accent-lime)]" />
                ) : (
                  <Moon className="w-4 h-4 text-[var(--text-secondary)]" />
                )}
              </button>

              {/* Desktop User info & Logout */}
              <div className="hidden md:flex items-center gap-2 ml-2">
                <span className="text-xs font-mono text-[var(--text-muted)] max-w-[130px] truncate">
                  {user?.email}
                </span>
                <button
                  id="logout-button"
                  type="button"
                  onClick={handleLogout}
                  title="Log out"
                  aria-label="Log out"
                  className="w-8 h-8 flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--alert-red)] rounded-md transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Server wake-up status banner for cold starts */}
      {isWaking && (
        <div
          id="server-waking-banner"
          className="bg-[var(--bg-surface)] border-b border-[var(--border-color)] px-4 py-2 text-xs font-mono text-[var(--text-secondary)]"
          role="status"
          aria-live="polite"
        >
          <div className="max-w-6xl mx-auto flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--text-primary)] shrink-0" />
            <span>{SERVER_WAKING_MESSAGE}</span>
          </div>
        </div>
      )}

      {/* Main Content with Route Change Transition (opacity + 2px translate, <250ms) */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-10">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>

      {/* Mobile Bottom Tab Bar (<768px) with Single Sliding Lime Indicator */}
      <nav
        id="mobile-tab-bar"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[var(--bg-surface)] border-t border-[var(--border-color)] px-2 py-1.5 flex items-center justify-around"
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`relative z-10 flex flex-col items-center justify-center py-1 px-2 min-w-[48px] text-center rounded-sm select-none transition-colors ${
                isActive
                  ? "text-[var(--accent-lime-text)] font-semibold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] font-mono tracking-tight leading-none">
                {item.shortLabel}
              </span>

              {/* Single continuous sliding indicator on mobile */}
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute inset-0 z-[-1] bg-[var(--accent-lime)] rounded-sm"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
