import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n";
import { formatCurrency as fmtCurrency } from "@/lib/currency";

interface MonthlyKPICardsProps {
  monthLabel: string;
  monthlyLoading: boolean;
  monthRevenueByCurrency: Record<string, number> | undefined;
  monthExpensesByCurrency: Record<string, number> | undefined;
  monthNetProfitByCurrency: Record<string, number> | undefined;
  monthTotalExpenses: number;
  teamPayouts: any;
  netIsPositive: boolean;
  fmt: (n: number) => string;
}

export function MonthlyKPICards({
  monthLabel,
  monthlyLoading,
  monthRevenueByCurrency,
  monthExpensesByCurrency,
  monthNetProfitByCurrency,
  monthTotalExpenses,
  teamPayouts,
  netIsPositive,
  fmt,
}: MonthlyKPICardsProps) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-md shadow-emerald-200 h-full">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider opacity-75">{t("revenueLabel")} · {monthLabel}</p>
                {monthlyLoading ? (
                  <p className="text-3xl font-bold mt-1">—</p>
                ) : (
                  (() => {
                    const byCur = monthRevenueByCurrency;
                    const entries = byCur ? Object.entries(byCur).filter(([, v]) => v > 0) : [];
                    return entries.length > 1 ? (
                      <div className="mt-1 space-y-0.5">
                        {entries.map(([cur, amt]) => (
                          <p key={cur} className="text-xl font-bold leading-tight">{fmtCurrency(amt, cur)}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-3xl font-bold mt-1">{entries.length > 0 ? fmtCurrency(entries[0][1], entries[0][0]) : "—"}</p>
                    );
                  })()
                )}
                <p className="text-xs opacity-70 mt-1">{t("paymentsCollected")}</p>
              </div>
              <div className="bg-white/20 rounded-xl p-2">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white border-0 shadow-md shadow-rose-200 h-full">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider opacity-75">{t("allCosts")} · {monthLabel}</p>
                {monthlyLoading ? (
                  <p className="text-3xl font-bold mt-1">—</p>
                ) : (
                  (() => {
                    const byCur = monthExpensesByCurrency;
                    const entries = byCur ? Object.entries(byCur).filter(([, v]) => v > 0) : [];
                    return entries.length > 1 ? (
                      <div className="mt-1 space-y-0.5">
                        {entries.map(([cur, amt]) => (
                          <p key={cur} className="text-xl font-bold leading-tight">{fmtCurrency(amt, cur)}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-3xl font-bold mt-1">{entries.length > 0 ? fmtCurrency(entries[0][1], entries[0][0]) : "—"}</p>
                    );
                  })()
                )}
                <div className="text-xs opacity-80 mt-1.5 flex flex-col gap-0.5">
                  {!monthlyLoading && teamPayouts && (
                    <>
                      <span>{t("teamPayouts")}: {fmt(teamPayouts.totalPayout)}</span>
                      <span>{t("expense")}: {fmt(monthTotalExpenses - teamPayouts.totalPayout)}</span>
                    </>
                  )}
                  {(monthlyLoading || !teamPayouts) && (
                    <span>{monthTotalExpenses} {t("records")}</span>
                  )}
                </div>
              </div>
              <div className="bg-white/20 rounded-xl p-2">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className={`border-0 shadow-md text-white h-full ${netIsPositive ? "bg-gradient-to-br from-violet-600 to-indigo-600 shadow-violet-200" : "bg-gradient-to-br from-slate-700 to-slate-800 shadow-slate-200"}`}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider opacity-75">{t("netProfit")} · {monthLabel}</p>
                {monthlyLoading ? (
                  <p className="text-3xl font-bold mt-1">—</p>
                ) : (
                  (() => {
                    const byCur = monthNetProfitByCurrency;
                    const entries = byCur ? Object.entries(byCur).filter(([, v]) => v > 0) : [];
                    return entries.length > 1 ? (
                      <div className="mt-1 space-y-0.5">
                        {entries.map(([cur, amt]) => (
                          <p key={cur} className="text-xl font-bold leading-tight">{fmtCurrency(amt, cur)}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-3xl font-bold mt-1">{entries.length > 0 ? fmtCurrency(entries[0][1], entries[0][0]) : "—"}</p>
                    );
                  })()
                )}
                <p className="text-xs opacity-70 mt-1">{netIsPositive ? t("revenueMinusExpenses") : t("netLossThisMonth")}</p>
              </div>
              <div className="bg-white/20 rounded-xl p-2">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
