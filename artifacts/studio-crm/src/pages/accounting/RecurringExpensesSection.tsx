import React, { useState } from "react";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { EXPENSE_CATEGORIES, CATEGORY_COLORS } from "./constants";

interface RecurringExpensesSectionProps {
  recurringTemplates: any[];
  fmt: (n: number) => string;
  categoryLabel: (cat: string) => string;
  createRecurring: any;
  updateRecurring: any;
  deleteRecurring: any;
  onInvalidateRecurring: () => void;
}

export function RecurringExpensesSection({
  recurringTemplates,
  fmt,
  categoryLabel,
  createRecurring,
  updateRecurring,
  deleteRecurring,
  onInvalidateRecurring,
}: RecurringExpensesSectionProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [recurringOpen, setRecurringOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<any | null>(null);
  const [deleteRecurringId, setDeleteRecurringId] = useState<number | null>(null);
  const [recurringForm, setRecurringForm] = useState({
    name: "", category: "Equipment", amount: "", description: "", isActive: true,
  });

  const handleSubmitRecurring = async (e: React.FormEvent) => {
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
      onInvalidateRecurring();
      setRecurringOpen(false);
      setEditingRecurring(null);
      setRecurringForm({ name: "", category: "Equipment", amount: "", description: "", isActive: true });
      toast({ description: editingRecurring ? t("saved") : t("created") });
    } catch {
      toast({ variant: "destructive", description: t("failedToSaveRecurring") });
    }
  };

  const handleToggleActive = async (tpl: any) => {
    try {
      await updateRecurring.mutateAsync({
        id: tpl.id,
        data: { isActive: !tpl.isActive },
      });
      onInvalidateRecurring();
    } catch { /* ignore */ }
  };

  const handleDeleteRecurring = async (id: number) => {
    try {
      await deleteRecurring.mutateAsync({ id });
      onInvalidateRecurring();
      setDeleteRecurringId(null);
      toast({ description: t("deleted") });
    } catch {
      toast({ variant: "destructive", description: t("failedToDelete") });
    }
  };

  const openEdit = (tpl: any) => {
    setEditingRecurring(tpl);
    setRecurringForm({
      name: tpl.name,
      category: tpl.category,
      amount: String(tpl.amount),
      description: tpl.description ?? "",
      isActive: tpl.isActive,
    });
    setRecurringOpen(true);
  };

  const closeDialog = () => {
    setRecurringOpen(false);
    setEditingRecurring(null);
    setRecurringForm({ name: "", category: "Equipment", amount: "", description: "", isActive: true });
  };

  return (
    <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          <CalendarDays className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          {t("recurringExpenses")}
        </CardTitle>
        <Dialog open={recurringOpen} onOpenChange={(v) => { setRecurringOpen(v); if (!v) closeDialog(); }}>
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
            <form onSubmit={handleSubmitRecurring} className="space-y-4 pt-1">
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
                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={closeDialog}>
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
                    onClick={() => handleToggleActive(tpl)}
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
                    onClick={() => openEdit(tpl)}
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
                        onClick={() => handleDeleteRecurring(tpl.id)}>
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
  );
}
