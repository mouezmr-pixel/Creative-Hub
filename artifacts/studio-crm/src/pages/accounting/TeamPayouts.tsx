import React from "react";
import { Users, Banknote, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";

interface TeamPayoutsProps {
  monthLabel: string;
  monthlyLoading: boolean;
  teamPayouts: any;
  fmt: (n: number) => string;
}

export function TeamPayouts({ monthLabel, monthlyLoading, teamPayouts, fmt }: TeamPayoutsProps) {
  const { t } = useLanguage();

  return (
    <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          <Users className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          {t("teamPayouts")} · {monthLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {monthlyLoading ? (
          <div className="h-24 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm animate-pulse">{t("loading")}</div>
        ) : !teamPayouts || teamPayouts.items.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
            <Users className="w-7 h-7 opacity-30" />
            <p className="text-sm">{t("noTeamCosts")} {monthLabel}</p>
            <p className="text-xs opacity-70">{t("setPaymentType")}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900 p-3 text-center">
                <p className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                  <Banknote className="w-3 h-3" /> {t("salaries")}
                </p>
                <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{fmt(teamPayouts.totalSalaries)}</p>
              </div>
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-100 dark:border-amber-900 p-3 text-center">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                  <Briefcase className="w-3 h-3" /> {t("perProject")}
                </p>
                <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{fmt(teamPayouts.totalPerProjectFees)}</p>
              </div>
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-100 dark:border-rose-900 p-3 text-center">
                <p className="text-xs text-rose-500 dark:text-rose-400 font-semibold uppercase tracking-wider mb-1">{t("totalPayout")}</p>
                <p className="text-lg font-bold text-rose-700 dark:text-rose-300">{fmt(teamPayouts.totalPayout)}</p>
              </div>
            </div>

            <div className="space-y-2">
              {teamPayouts.items.map((item: any) => (
                <div key={item.userId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: item.paymentType === "monthly_salary" ? "#6366f1" : "#f59e0b" }}>
                    {item.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {item.paymentType === "monthly_salary"
                        ? t("monthlySalary")
                        : item.commissionType === "percentage"
                          ? t("commissionPercent")
                          : t("flatFee")}
                    </p>
                  </div>
                  <Badge className={`text-xs font-medium border flex-shrink-0 ${item.paymentType === "monthly_salary" ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" : "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"}`}>
                    {item.paymentType === "monthly_salary" ? t("salary") : t("perProject")}
                  </Badge>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400 flex-shrink-0">{fmt(item.amount)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
