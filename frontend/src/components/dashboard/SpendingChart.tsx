import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { BudgetSummaryCategory } from "../../types";

interface SpendingChartProps {
  categories: BudgetSummaryCategory[];
  hideBalances?: boolean;
}

export const SpendingChart: React.FC<SpendingChartProps> = ({ categories, hideBalances = false }) => {
  if (!categories || categories.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs font-mono text-[var(--text-muted)]">
        no category spending recorded
      </div>
    );
  }

  const chartData = categories.map((c) => ({
    name: c.category,
    Spent: c.spent,
    Budgeted: c.budgeted,
    isWarning: c.isWarning || c.isOverLimit,
    percentage: c.percentage,
  }));

  const getBarColor = (isWarning: boolean) => {
    return isWarning ? "#E5554E" : "#C9F24D";
  };

  return (
    <div className="w-full h-56 pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 0, left: -10, bottom: 20 }}
        >
          <XAxis
            dataKey="name"
            tick={{ fill: "var(--text-secondary)", fontSize: 11, fontFamily: "var(--font-mono)" }}
            angle={-15}
            textAnchor="end"
            interval={0}
            height={32}
            axisLine={{ stroke: "var(--border-color)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--text-secondary)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickFormatter={(val) => (hideBalances ? "₦••" : `₦${(val / 1000).toFixed(0)}k`)}
            axisLine={{ stroke: "var(--border-color)" }}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(255, 255, 255, 0.03)" }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-[var(--bg-surface)] p-2.5 border border-[var(--border-color)] text-xs shadow-none">
                    <p className="font-sans font-medium text-[var(--text-primary)] mb-1">
                      {data.name}
                    </p>
                    <p className="text-[var(--text-secondary)] font-mono text-[11px] tabular-nums">
                      Spent: {hideBalances ? "₦••••••" : `₦${data.Spent.toLocaleString()}`}
                    </p>
                    <p className="text-[var(--text-secondary)] font-mono text-[11px] tabular-nums">
                      Limit: {hideBalances ? "₦••••••" : `₦${data.Budgeted.toLocaleString()}`}
                    </p>
                    <p
                      className={`font-mono text-[11px] mt-1 ${
                        data.isWarning ? "text-[var(--alert-red)] font-semibold" : "text-[var(--text-primary)]"
                      }`}
                    >
                      {data.percentage}% utilized
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="Budgeted" fill="var(--border-color)" radius={0} maxBarSize={20} />
          <Bar dataKey="Spent" radius={0} maxBarSize={20}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.isWarning)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
