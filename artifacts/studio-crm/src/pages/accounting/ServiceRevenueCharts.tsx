import React, { useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { PieChart as PieIcon, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import { formatCurrency as fmtCurrency } from "@/lib/currency";
import { PIE_COLORS, ActiveShape } from "./constants";

interface ServiceRevenueChartsProps {
  monthLabel: string;
  monthlyLoading: boolean;
  pieData: any[];
  monthRevenueByCurrency: Record<string, number> | undefined;
  fmt: (n: number) => string;
}

export function ServiceRevenueCharts({
  monthLabel,
  monthlyLoading,
  pieData,
  monthRevenueByCurrency,
  fmt,
}: ServiceRevenueChartsProps) {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <PieIcon className="w-4 h-4 text-violet-500 dark:text-violet-400" />
            {t("revenueByService")} · {monthLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyLoading ? (
            <div className="h-56 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">{t("loading")}</div>
          ) : pieData.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
              <PieIcon className="w-8 h-8 opacity-30" />
              <p className="text-sm">{t("noRevenueData")} {monthLabel}</p>
              <p className="text-xs">{t("completeProjects")}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  activeIndex={activeIndex}
                  activeShape={ActiveShape}
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  dataKey="revenue"
                  nameKey="serviceName"
                  onMouseEnter={(_, idx) => setActiveIndex(idx)}
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <BarChart3 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            {t("serviceBreakdown")} · {monthLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {monthlyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : pieData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500 gap-2">
              <BarChart3 className="w-8 h-8 opacity-30" />
              <p className="text-sm">{t("noServiceData")}</p>
            </div>
          ) : (
            pieData.map((svc: any, idx: number) => {
              const byCur: Record<string, number> = svc.revenueByCurrency ?? {};
              const curEntries = Object.entries(byCur).filter(([, v]) => v > 0);
              const multiCurrency = curEntries.length > 1;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[160px]">{svc.serviceName}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">({svc.projectCount} {t("projectsShort")})</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {multiCurrency ? (
                        <div className="flex flex-col items-end gap-0.5">
                          {curEntries.map(([cur, amt]) => (
                            <span key={cur} className="text-xs font-bold text-slate-900 dark:text-slate-100">{fmtCurrency(amt, cur)}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {curEntries.length > 0 ? fmtCurrency(curEntries[0][1], curEntries[0][0]) : fmt(svc.revenue)}
                        </span>
                      )}
                      <Badge className="text-xs bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 border">
                        {svc.percentage}%
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${svc.percentage}%`, backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })
          )}
          {!monthlyLoading && pieData.length > 0 && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("totalRevenue")}</span>
                {(() => {
                  const entries = monthRevenueByCurrency ? Object.entries(monthRevenueByCurrency).filter(([, v]) => v > 0) : [];
                  return entries.length > 1 ? (
                    <div className="flex flex-col items-end gap-0.5">
                      {entries.map(([cur, amt]) => (
                        <span key={cur} className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{fmtCurrency(amt, cur)}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{entries.length > 0 ? fmtCurrency(entries[0][1], entries[0][0]) : "—"}</span>
                  );
                })()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
