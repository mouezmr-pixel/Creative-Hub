import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListExpenses,
  useCreateExpense,
  useDeleteExpense,
  useGetAccountingSummary,
  useGetMonthlyAccounting,
  useListRecurringExpenses,
  useCreateRecurringExpense,
  useUpdateRecurringExpense,
  useDeleteRecurringExpense,
  getListExpensesQueryKey,
  getGetAccountingSummaryQueryKey,
  getGetMonthlyAccountingQueryKey,
  getListRecurringExpensesQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Plus, Calculator, CalendarDays, ChevronLeft, ChevronRight,
} from "lucide-react";
import { format, subMonths, addMonths, startOfMonth } from "date-fns";
import { ar as arLocale, fr as frLocale, enUS as enLocale } from "date-fns/locale";
import { formatCurrency as fmtCurrency } from "@/lib/currency";
import { EXPENSE_CATEGORIES } from "./constants";
import { MonthlyKPICards } from "./MonthlyKPICards";
import { ServiceRevenueCharts } from "./ServiceRevenueCharts";
import { TeamPayouts } from "./TeamPayouts";
import { RecurringExpensesSection } from "./RecurringExpensesSection";
import { TransactionTable } from "./TransactionTable";
import { RevenueBarChart } from "./RevenueBarChart";
import { ExpenseLog } from "./ExpenseLog";

export default function Accounting() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const qc = useQueryClient();
  const fmt = (n: number) => fmtCurrency(n, "DZD");

  const locale = language === "ar" ? arLocale : language === "fr" ? frLocale : enLocale;

  const categoryLabel = (cat: string): string => {
    const map: Record<string, string> = {
      Equipment: t("catEquipment"),
      Software: t("catSoftware"),
      Marketing: t("catMarketing"),
      Transport: t("catTransport"),
      "Studio Rent": t("catStudioRent"),
      Utilities: t("catUtilities"),
      Staff: t("catStaff"),
      creative_payout: t("catCreativePayout"),
      Other: t("catOther"),
    };
    return map[cat] ?? cat;
  };

  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const monthParam = format(selectedMonth, "yyyy-MM");
  const monthLabel = format(selectedMonth, "MMMM yyyy", { locale });

  const thisMonth = () => format(new Date(), "yyyy-MM");
  const isCurrentMonth = format(selectedMonth, "yyyy-MM") === thisMonth();

  const goToPrev = () => setSelectedMonth((m) => subMonths(m, 1));
  const goToNext = () => {
    const nextMonth = addMonths(selectedMonth, 1);
    if (nextMonth <= startOfMonth(new Date())) {
      setSelectedMonth(nextMonth);
      processSalaries(format(nextMonth, "yyyy-MM"));
      processRecurring(format(nextMonth, "yyyy-MM"));
    }
  };

  const prevMonthRef = React.useRef("");
  useEffect(() => {
    const check = () => {
      const current = format(new Date(), "yyyy-MM");
      if (current !== prevMonthRef.current) {
        prevMonthRef.current = current;
        setSelectedMonth(startOfMonth(new Date()));
        processSalaries(current);
        processRecurring(current);
      }
    };
    check();
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const processSalaries = async (month: string) => {
    try {
      await fetch(`/api/accounting/process-salaries/${month}`, {
        method: "POST", credentials: "include",
      });
      qc.invalidateQueries({ queryKey: getListExpensesQueryKey() });
      qc.invalidateQueries({ queryKey: getGetAccountingSummaryQueryKey() });
      qc.invalidateQueries({ queryKey: getGetMonthlyAccountingQueryKey({ month: monthParam }) });
    } catch { /* ignore */ }
  };

  const processRecurring = async (month: string) => {
    try {
      await fetch(`/api/accounting/process-recurring/${month}`, {
        method: "POST", credentials: "include",
      });
      qc.invalidateQueries({ queryKey: getListExpensesQueryKey() });
      qc.invalidateQueries({ queryKey: getGetAccountingSummaryQueryKey() });
      qc.invalidateQueries({ queryKey: getGetMonthlyAccountingQueryKey({ month: monthParam }) });
    } catch { /* ignore */ }
  };

  const { data: expenses = [], isLoading: expensesLoading } = useListExpenses();
  const { data: summary, isLoading: summaryLoading } = useGetAccountingSummary();
  const { data: monthly, isLoading: monthlyLoading } = useGetMonthlyAccounting({ month: monthParam });
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const { data: recurringTemplates = [] } = useListRecurringExpenses();
  const createRecurring = useCreateRecurringExpense();
  const updateRecurring = useUpdateRecurringExpense();
  const deleteRecurring = useDeleteRecurringExpense();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    category: "Equipment", amount: "", date: new Date().toISOString().split("T")[0], description: "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category || !form.amount || !form.date) return;
    try {
      await createExpense.mutateAsync({
        data: { category: form.category, amount: parseFloat(form.amount), date: form.date, description: form.description || null },
      });
      qc.invalidateQueries({ queryKey: getListExpensesQueryKey() });
      qc.invalidateQueries({ queryKey: getGetAccountingSummaryQueryKey() });
      qc.invalidateQueries({ queryKey: getGetMonthlyAccountingQueryKey({ month: monthParam }) });
      setForm({ category: "Equipment", amount: "", date: new Date().toISOString().split("T")[0], description: "" });
      setOpen(false);
      toast({ description: t("recordExpense") });
    } catch {
      toast({ variant: "destructive", description: t("failedToAddExpense") });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteExpense.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListExpensesQueryKey() });
      qc.invalidateQueries({ queryKey: getGetAccountingSummaryQueryKey() });
      qc.invalidateQueries({ queryKey: getGetMonthlyAccountingQueryKey({ month: monthParam }) });
      toast({ description: t("expenseDeleted") });
    } catch {
      toast({ variant: "destructive", description: t("failedToDelete") });
    }
  };

  const chartData = (summary?.monthly ?? []).map((m: any) => {
    const revByCur: Record<string, number> = m.revenueByCurrency ?? {};
    const expByCur: Record<string, number> = m.expensesByCurrency ?? {};
    const totalRev = Object.values(revByCur).reduce((s: number, v: any) => s + (typeof v === 'number' ? v : 0), 0);
    const totalExp = Object.values(expByCur).reduce((s: number, v: any) => s + (typeof v === 'number' ? v : 0), 0);
    return {
      month: m.month.substring(5),
      Revenue: totalRev,
      Expenses: totalExp,
      Profit: totalRev - totalExp,
    };
  }).slice(-6);

  const monthRevenueByCurrency = (monthly as any)?.revenueByCurrency as Record<string, number> | undefined;
  const monthExpensesByCurrency = (monthly as any)?.expensesByCurrency as Record<string, number> | undefined;
  const monthNetProfitByCurrency = (monthly as any)?.netProfitByCurrency as Record<string, number> | undefined;

  const monthTotalExpenses = Object.values(monthExpensesByCurrency ?? {}).reduce((s: number, v: any) => s + (typeof v === 'number' ? v : 0), 0);
  const monthTotalProfit = Object.values(monthNetProfitByCurrency ?? {}).reduce((s: number, v: any) => s + (typeof v === 'number' ? v : 0), 0);
  const netIsPositive = monthTotalProfit >= 0;
  const teamPayouts = (monthly as any)?.teamPayouts ?? null;

  const pieData = (monthly?.serviceBreakdown ?? []).filter((s) => s.revenue > 0);

  const handleInvalidateRecurring = () => {
    qc.invalidateQueries({ queryKey: getListRecurringExpensesQueryKey() });
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Calculator className="h-6 w-6 text-primary" />
              {t("accountingTitle")}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">{t("accountingSubtitle")}</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl bg-rose-500 hover:bg-rose-600 flex-shrink-0">
              <Plus className="h-4 w-4" />{t("addExpense")}
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-900 dark:text-slate-100">{t("recordExpense")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("expenseCategory")} *</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("expenseAmount")} *</Label>
                  <Input type="number" step="0.01" value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00" className="rounded-xl" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("expenseDate")} *</Label>
                  <Input type="date" value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="rounded-xl" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("expenseDescription")}</Label>
                <Input value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder={t("briefNote")} className="rounded-xl" />
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setOpen(false)}>{t("cancel")}</Button>
                <Button type="submit" className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-600" disabled={createExpense.isPending}>
                  {createExpense.isPending ? t("adding") : t("recordExpense")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-border rounded-2xl px-4 py-3 w-fit">
        <CalendarDays className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("period")}</span>
        <button onClick={goToPrev} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800 transition-colors">
          <ChevronLeft className="w-4 h-4 text-slate-500 dark:text-slate-400 dark:text-slate-500" />
        </button>
        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 min-w-[120px] text-center">{monthLabel}</span>
        <button onClick={goToNext} disabled={isCurrentMonth}
          className={`p-1 rounded-lg transition-colors ${isCurrentMonth ? "opacity-30 cursor-not-allowed" : "hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800"}`}>
          <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400 dark:text-slate-500" />
        </button>
      </div>

      <MonthlyKPICards
        monthLabel={monthLabel}
        monthlyLoading={monthlyLoading}
        monthRevenueByCurrency={monthRevenueByCurrency}
        monthExpensesByCurrency={monthExpensesByCurrency}
        monthNetProfitByCurrency={monthNetProfitByCurrency}
        monthTotalExpenses={monthTotalExpenses}
        teamPayouts={teamPayouts}
        netIsPositive={netIsPositive}
        fmt={fmt}
      />

      <ServiceRevenueCharts
        monthLabel={monthLabel}
        monthlyLoading={monthlyLoading}
        pieData={pieData}
        monthRevenueByCurrency={monthRevenueByCurrency}
        fmt={fmt}
      />

      <TeamPayouts
        monthLabel={monthLabel}
        monthlyLoading={monthlyLoading}
        teamPayouts={teamPayouts}
        fmt={fmt}
      />

      <RecurringExpensesSection
        recurringTemplates={recurringTemplates}
        fmt={fmt}
        categoryLabel={categoryLabel}
        createRecurring={createRecurring}
        updateRecurring={updateRecurring}
        deleteRecurring={deleteRecurring}
        onInvalidateRecurring={handleInvalidateRecurring}
      />

      <TransactionTable
        monthLabel={monthLabel}
        monthlyLoading={monthlyLoading}
        transactions={monthly?.transactions ?? []}
        categoryLabel={categoryLabel}
        monthNetProfitByCurrency={monthNetProfitByCurrency}
        netIsPositive={netIsPositive}
      />

      <RevenueBarChart
        summaryLoading={summaryLoading}
        chartData={chartData}
        fmt={fmt}
      />

      <ExpenseLog
        expenses={expenses}
        expensesLoading={expensesLoading}
        categoryLabel={categoryLabel}
        fmt={fmt}
        onDelete={handleDelete}
      />
    </div>
  );
}
