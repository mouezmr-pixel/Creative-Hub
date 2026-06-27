import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { CATEGORY_COLORS } from "./constants";

interface ExpenseLogProps {
  expenses: any[];
  expensesLoading: boolean;
  categoryLabel: (cat: string) => string;
  fmt: (n: number) => string;
  onDelete: (id: number) => void;
}

export function ExpenseLog({ expenses, expensesLoading, categoryLabel, fmt, onDelete }: ExpenseLogProps) {
  const { t } = useLanguage();
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  return (
    <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("allExpensesLog")}</CardTitle>
        <span className="text-xs text-slate-400 dark:text-slate-500">{expenses.length} {t("totalRecords")}</span>
      </CardHeader>
      <CardContent className="p-0">
        {expensesLoading ? (
          <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-sm">{t("loading")}</div>
        ) : expenses.length === 0 ? (
          <div className="p-10 text-center text-slate-400 dark:text-slate-500 text-sm">{t("noExpensesYet")}</div>
        ) : (
          <div className="divide-y divide-border">
            <AnimatePresence>
              {[...expenses].reverse().map((expense: any) => {
                const catColor = CATEGORY_COLORS[expense.category] ?? CATEGORY_COLORS.Other;
                return (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs border ${catColor}`}>{categoryLabel(expense.category)}</Badge>
                        {expense.description && (
                          <span className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500 truncate">{expense.description}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{expense.date}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400">−{fmt(expense.amount)}</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        {confirmDelete === expense.id ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="destructive" className="h-6 text-xs rounded-lg px-1.5" onClick={() => onDelete(expense.id)}>{t("delete")}</Button>
                            <Button size="sm" variant="ghost" className="h-6 text-xs rounded-lg px-1.5" onClick={() => setConfirmDelete(null)}>{t("cancel")}</Button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDelete(expense.id)} className="text-slate-300 hover:text-rose-500 dark:text-rose-400 transition-colors p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
