import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n";

interface RevenueBarChartProps {
  summaryLoading: boolean;
  chartData: any[];
  fmt: (n: number) => string;
}

export function RevenueBarChart({ summaryLoading, chartData, fmt }: RevenueBarChartProps) {
  const { t } = useLanguage();

  return (
    <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          <BarChart3 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          {t("revenueVsExpenses")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {summaryLoading ? (
          <div className="h-56 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">{t("loadingChart")}</div>
        ) : chartData.length === 0 || chartData.every((d: any) => d.Revenue === 0 && d.Expenses === 0) ? (
          <div className="h-56 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">{t("noData")}</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => {
                const num = v >= 1000 ? (v / 1000).toFixed(0) + "k" : v;
                return `${num} DA`;
              }} />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                formatter={(value: any) => fmt(value)}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              <Bar dataKey="Revenue" name={t("revenueLabel")} fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" name={t("expensesLabel")} fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
