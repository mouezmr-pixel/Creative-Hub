import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import { formatCurrency as fmtCurrency } from "@/lib/currency";
import { CATEGORY_COLORS } from "./constants";

interface TransactionTableProps {
  monthLabel: string;
  monthlyLoading: boolean;
  transactions: any[];
  categoryLabel: (cat: string) => string;
  monthNetProfitByCurrency: Record<string, number> | undefined;
  netIsPositive: boolean;
}

export function TransactionTable({
  monthLabel,
  monthlyLoading,
  transactions,
  categoryLabel,
  monthNetProfitByCurrency,
  netIsPositive,
}: TransactionTableProps) {
  const { t } = useLanguage();

  return (
    <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <Receipt className="w-4 h-4 text-teal-500 dark:text-teal-400" />
            {t("allTransactions")} · {monthLabel}
          </CardTitle>
          <span className="text-xs text-slate-400 dark:text-slate-500">{transactions.length} {t("records")}</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {monthlyLoading ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">{t("loading")}</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 dark:text-slate-500 text-sm">{t("noTransactions")} {monthLabel}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-slate-50 dark:bg-slate-800">
                  <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">{t("name")}</th>
                  <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-3">{t("expenseCategory")}</th>
                  <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-3">{t("expenseDate")}</th>
                  <th className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">{t("expenseAmount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <AnimatePresence>
                  {transactions.map((tx: any, idx: number) => (
                    <motion.tr
                      key={`${tx.type}-${tx.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-6 rounded-full flex-shrink-0 ${tx.type === "revenue" ? "bg-emerald-400" : "bg-rose-400"}`} />
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{tx.name}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">{tx.type === "revenue" ? t("revenue") : t("expense")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {tx.category ? (
                          <Badge className={`text-xs border ${CATEGORY_COLORS[tx.category] ?? "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700"}`}>
                            {categoryLabel(tx.category)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 whitespace-nowrap">{tx.date}</td>
                      <td className={`px-5 py-3 text-right text-sm font-bold whitespace-nowrap ${tx.type === "revenue" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {tx.type === "revenue" ? "+" : "−"}{fmtCurrency(tx.amount, tx.currency ?? "DZD")}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-slate-50 dark:bg-slate-800">
                  <td colSpan={3} className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("netFor")} {monthLabel}</td>
                  <td className={`px-5 py-3 text-right text-sm font-bold ${netIsPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {(() => {
                      const byCur = monthNetProfitByCurrency;
                      const entries = byCur ? Object.entries(byCur).filter(([, v]) => v > 0) : [];
                      if (entries.length === 0) return "—";
                      return entries.length > 1 ? (
                        <div className="flex flex-col items-end gap-0.5">
                          {entries.map(([cur, amt]) => (
                            <span key={cur}>{amt >= 0 ? "+" : "−"}{fmtCurrency(Math.abs(amt), cur)}</span>
                          ))}
                        </div>
                      ) : (
                        <span>{entries[0][1] >= 0 ? "+" : "−"}{fmtCurrency(Math.abs(entries[0][1]), entries[0][0])}</span>
                      );
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
