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
  useProcessRecurringExpenses,
  getListExpensesQueryKey,
  getGetAccountingSummaryQueryKey,
  getGetMonthlyAccountingQueryKey,
  getListRecurringExpensesQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, Sector,
} from "recharts";
import {
  Plus, TrendingUp, TrendingDown, Wallet, Trash2, Calculator,
  CalendarDays, ArrowUpRight, ArrowDownRight, BarChart3, PieChart as PieIcon,
  Receipt, ChevronLeft, ChevronRight, Users, Banknote, Briefcase,
} from "lucide-react";
import { format, subMonths, addMonths, startOfMonth } from "date-fns";
import { ar as arLocale, fr as frLocale, enUS as enLocale } from "date-fns/locale";
import { formatCurrency as fmtCurrency } from "@/lib/currency";

const EXPENSE_CATEGORIES = [
  "Equipment", "Software", "Marketing", "Transport",
  "Studio Rent", "Utilities", "Staff", "creative_payout", "Other",
];

const CATEGORY_COLORS: Record<string, string> = {
  Equipment: "bg-blue-50 text-blue-700 border-blue-200",
  Software: "bg-violet-50 text-violet-700 border-violet-200",
  Marketing: "bg-amber-50 text-amber-700 border-amber-200",
  Transport: "bg-orange-50 text-orange-700 border-orange-200",
  "Studio Rent": "bg-pink-50 text-pink-700 border-pink-200",
  Utilities: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Staff: "bg-indigo-50 text-indigo-700 border-indigo-200",
  creative_payout: "bg-rose-50 text-rose-700 border-rose-200",
  Other: "bg-slate-50 text-slate-600 border-slate-200",
};

const PIE_COLORS = ["#7c3aed", "#3b82f6", "#10b981", "#0891b2", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"];

function ActiveShape(props: any) {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent,
  } = props;
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" fill="currentColor" className="text-sm font-bold text-slate-900 dark:text-slate-100" fontSize={13} fontWeight={700}>
        {payload.serviceName.length > 16 ? payload.serviceName.substring(0, 14) + "…" : payload.serviceName}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="currentColor" className="text-violet-600 dark:text-violet-400" fontSize={15} fontWeight={800}>
        {(percent * 100).toFixed(0)}%
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 10} outerRadius={outerRadius + 14} startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
}

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

  // ── Auto-detect month change & auto-process salaries ──
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
    check(); // run once on mount
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

  const [activeIndex, setActiveIndex] = useState(0);

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
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [form, setForm] = useState({
    category: "Equipment", amount: "", date: new Date().toISOString().split("T")[0], description: "",
  });
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<any | null>(null);
  const [deleteRecurringId, setDeleteRecurringId] = useState<number | null>(null);
  const [recurringForm, setRecurringForm] = useState({
    name: "", category: "Equipment", amount: "", description: "", isActive: true,
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
      setConfirmDelete(null);
      toast({ description: t("expenseDeleted") });
    } catch {
      toast({ variant: "destructive", description: t("failedToDelete") });
    }
  };

  const chartData = (summary?.monthly ?? []).map((m: any) => ({
    month: m.month.substring(5),
    Revenue: m.revenue,
    Expenses: m.expenses,
    Profit: m.revenue - m.expenses,
  })).slice(-6);

  const monthRevenue = monthly?.revenue ?? 0;
  const monthExpenses = monthly?.expenses ?? 0;
  const monthProfit = monthly?.netProfit ?? 0;
  const netIsPositive = monthProfit >= 0;
  const teamPayouts = (monthly as any)?.teamPayouts ?? null;

  const pieData = (monthly?.serviceBreakdown ?? []).filter((s) => s.revenue > 0);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* ── Header ── */}
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

      {/* ── Month Selector ── */}
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

      {/* ── Monthly KPI Cards ── */}
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
                      const byCur = (monthly as any)?.revenueByCurrency as Record<string, number> | undefined;
                      const entries = byCur ? Object.entries(byCur).filter(([, v]) => v > 0) : [];
                      return entries.length > 1 ? (
                        <div className="mt-1 space-y-0.5">
                          {entries.map(([cur, amt]) => (
                            <p key={cur} className="text-xl font-bold leading-tight">{fmtCurrency(amt, cur)}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-3xl font-bold mt-1">{fmt(monthRevenue)}</p>
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
                  <p className="text-3xl font-bold mt-1">{monthlyLoading ? "—" : fmt(monthExpenses)}</p>
                  <div className="text-xs opacity-80 mt-1.5 flex flex-col gap-0.5">
                    {!monthlyLoading && teamPayouts && (
                      <>
                        <span>{t("teamPayouts")}: {fmt(teamPayouts.totalPayout)}</span>
                        <span>{t("expense")}: {fmt(monthExpenses - teamPayouts.totalPayout)}</span>
                      </>
                    )}
                    {(monthlyLoading || !teamPayouts) && (
                      <span>{(monthly?.transactions ?? []).filter((tx: any) => tx.type === "expense").length} {t("records")}</span>
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
                  <p className="text-3xl font-bold mt-1">{monthlyLoading ? "—" : fmt(monthProfit)}</p>
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

      {/* ── Service Revenue Analytics + Pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
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

        {/* Service list */}
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
                    const byCur = (monthly as any)?.revenueByCurrency as Record<string, number> | undefined;
                    const entries = byCur ? Object.entries(byCur).filter(([, v]) => v > 0) : [];
                    return entries.length > 1 ? (
                      <div className="flex flex-col items-end gap-0.5">
                        {entries.map(([cur, amt]) => (
                          <span key={cur} className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{fmtCurrency(amt, cur)}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmt(monthRevenue)}</span>
                    );
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Team Payouts ── */}
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
              {/* Summary row */}
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

              {/* Individual breakdown */}
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

      {/* ── Recurring Expenses Templates ── */}
      <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <CalendarDays className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            {t("recurringExpenses")}
          </CardTitle>
          <Dialog open={recurringOpen} onOpenChange={(v) => { setRecurringOpen(v); if (!v) { setEditingRecurring(null); setRecurringForm({ name: "", category: "Equipment", amount: "", description: "", isActive: true }); }}}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600">
                <Plus className="h-3.5 w-3.5" />{t("addRecurring")}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-md">
              <DialogHeader>
                <DialogTitle className="font-bold text-slate-900 dark:text-slate-100">
                  {editingRecurring ? t("editRecurring") : t("addRecurring")}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!recurringForm.name || !recurringForm.category || !recurringForm.amount) return;
                try {
                  if (editingRecurring) {
                    await updateRecurring.mutateAsync({
                      id: editingRecurring.id,
                      data: {
                        name: recurringForm.name,
                        category: recurringForm.category,
                        amount: parseFloat(recurringForm.amount),
                        description: recurringForm.description || null,
                        isActive: recurringForm.isActive,
                      },
                    });
                  } else {
                    await createRecurring.mutateAsync({
                      data: {
                        name: recurringForm.name,
                        category: recurringForm.category,
                        amount: parseFloat(recurringForm.amount),
                        description: recurringForm.description || null,
                        isActive: recurringForm.isActive,
                      },
                    });
                  }
                  qc.invalidateQueries({ queryKey: getListRecurringExpensesQueryKey() });
                  setRecurringOpen(false);
                  setEditingRecurring(null);
                  setRecurringForm({ name: "", category: "Equipment", amount: "", description: "", isActive: true });
                  toast({ description: editingRecurring ? t("saved") : t("created") });
                } catch {
                  toast({ variant: "destructive", description: t("failedToSaveRecurring") });
                }
              }} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("name")} *</Label>
                  <Input value={recurringForm.name}
                    onChange={(e) => setRecurringForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder={t("studioRentExample")} className="rounded-xl" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("expenseCategory")} *</Label>
                    <Select value={recurringForm.category}
                      onValueChange={(v) => setRecurringForm((f) => ({ ...f, category: v }))}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("expenseAmount")} *</Label>
                    <Input type="number" step="0.01" value={recurringForm.amount}
                      onChange={(e) => setRecurringForm((f) => ({ ...f, amount: e.target.value }))}
                      placeholder="0.00" className="rounded-xl" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("expenseDescription")}</Label>
                  <Input value={recurringForm.description}
                    onChange={(e) => setRecurringForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder={t("briefNote")} className="rounded-xl" />
                </div>
                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => { setRecurringOpen(false); setEditingRecurring(null); }}>
                    {t("cancel")}
                  </Button>
                  <Button type="submit" className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600"
                    disabled={createRecurring.isPending || updateRecurring.isPending}>
                    {createRecurring.isPending || updateRecurring.isPending ? t("saving") : t("save")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          {recurringTemplates.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t("noExpensesYet")}</p>
              <p className="text-xs mt-1 opacity-70">{t("addRecurring")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recurringTemplates.map((tpl: any) => (
                <div key={tpl.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{tpl.name}</span>
                      <Badge className={`text-xs border ${CATEGORY_COLORS[tpl.category] ?? "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700"}`}>
                        {categoryLabel(tpl.category)}
                      </Badge>
                      <Badge className={`text-xs border ${tpl.isActive ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700"}`}>
                        {tpl.isActive ? t("active") : t("inactive")}
                      </Badge>
                    </div>
                    {tpl.description && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{tpl.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{fmt(tpl.amount)}</span>
                    <button
                      onClick={async () => {
                        try {
                          await updateRecurring.mutateAsync({
                            id: tpl.id,
                            data: { isActive: !tpl.isActive },
                          });
                          qc.invalidateQueries({ queryKey: getListRecurringExpensesQueryKey() });
                        } catch { /* ignore */ }
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${tpl.isActive ? "text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 dark:bg-emerald-950" : "text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800"}`}
                      title={t("toggleActive")}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {tpl.isActive ? (
                          <>
                            <rect x="1" y="5" width="22" height="14" rx="7" ry="7" />
                            <circle cx="16" cy="12" r="3" />
                          </>
                        ) : (
                          <>
                            <rect x="1" y="5" width="22" height="14" rx="7" ry="7" />
                            <circle cx="8" cy="12" r="3" />
                          </>
                        )}
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setEditingRecurring(tpl);
                        setRecurringForm({
                          name: tpl.name,
                          category: tpl.category,
                          amount: String(tpl.amount),
                          description: tpl.description ?? "",
                          isActive: tpl.isActive,
                        });
                        setRecurringOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    {deleteRecurringId === tpl.id ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="destructive" className="h-6 text-xs rounded-lg px-1.5"
                          onClick={async () => {
                            try {
                              await deleteRecurring.mutateAsync({ id: tpl.id });
                              qc.invalidateQueries({ queryKey: getListRecurringExpensesQueryKey() });
                              setDeleteRecurringId(null);
                              toast({ description: t("deleted") });
                            } catch {
                               toast({ variant: "destructive", description: t("failedToDelete") });
                            }
                          }}>
                          {t("delete")}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-xs rounded-lg px-1.5"
                          onClick={() => setDeleteRecurringId(null)}>
                          {t("cancel")}
                        </Button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteRecurringId(tpl.id)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 dark:bg-rose-950 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Transaction Table ── */}
      <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <Receipt className="w-4 h-4 text-teal-500 dark:text-teal-400" />
              {t("allTransactions")} · {monthLabel}
            </CardTitle>
            <span className="text-xs text-slate-400 dark:text-slate-500">{(monthly?.transactions ?? []).length} {t("records")}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {monthlyLoading ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">{t("loading")}</div>
          ) : (monthly?.transactions ?? []).length === 0 ? (
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
                    {(monthly?.transactions ?? []).map((tx: any, idx: number) => (
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
                      {netIsPositive ? "+" : "−"}{fmt(Math.abs(monthProfit))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── All-time Bar Chart ── */}
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

      {/* ── Full Expense Log ── */}
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
                              <Button size="sm" variant="destructive" className="h-6 text-xs rounded-lg px-1.5" onClick={() => handleDelete(expense.id)}>{t("delete")}</Button>
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
    </div>
  );
}
