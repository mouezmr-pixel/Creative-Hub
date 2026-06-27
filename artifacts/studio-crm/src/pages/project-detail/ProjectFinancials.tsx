import React from "react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/currency";
import type { Payment } from "@workspace/api-client-react";

interface ProjectFinancialsProps {
  project: any;
  editFields: Record<string, any>;
  setEditFields: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  save: (field: string, value: any) => Promise<void>;
  projectPayments: any;
  paymentsLoading: boolean;
  fmtMoney: (val: number) => string;
  amountPaid: number;
  onShowPaymentForm: () => void;
  onDeletePayment: (paymentId: number) => Promise<void>;
}

export function ProjectFinancials({
  project,
  editFields,
  setEditFields,
  save,
  projectPayments,
  paymentsLoading,
  fmtMoney,
  amountPaid,
  onShowPaymentForm,
  onDeletePayment,
}: ProjectFinancialsProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const projCurrency = project?.currency ?? "DZD";

  return (
    <div className="space-y-6">
      {user?.role !== "client" && (
        <Card className="bg-white dark:bg-slate-900 shadow-sm border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
              {t("financials")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("expectedCost")}</Label>
              <Input
                type="number"
                step="0.01"
                value={editFields.expectedCost}
                onChange={(e) => setEditFields((f: any) => ({ ...f, expectedCost: e.target.value }))}
                onBlur={() => save("expectedCost", editFields.expectedCost ? parseFloat(editFields.expectedCost) : null)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("finalCost")}</Label>
              <Input
                type="number"
                step="0.01"
                value={editFields.finalCost}
                onChange={(e) => setEditFields((f: any) => ({ ...f, finalCost: e.target.value }))}
                onBlur={() => save("finalCost", editFields.finalCost ? parseFloat(editFields.finalCost) : null)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("amountPaid")}</Label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{fmtMoney(projectPayments?.summary?.totalPaid ?? amountPaid)}</span>
                <span className="text-xs text-emerald-500 dark:text-emerald-400 ml-auto">{t("paymentHistory")}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("discountLabel")}</Label>
              <Input
                type="number"
                step="0.01"
                value={editFields.discount}
                onChange={(e) => setEditFields((f: any) => ({ ...f, discount: e.target.value }))}
                onBlur={() => save("discount", editFields.discount ? parseFloat(editFields.discount) : 0)}
                className="rounded-xl"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {user?.role !== "client" && (
        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              {t("paymentHistory")}
            </CardTitle>
            {user?.role === "admin" && (
              <Button
                size="sm"
                className="h-7 rounded-xl text-xs gap-1.5 bg-emerald-500 hover:bg-emerald-600"
                onClick={onShowPaymentForm}
              >
                <Plus className="h-3 w-3" /> {t("recordPayment")}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
              </div>
            ) : (projectPayments?.payments ?? []).length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-border">
                {t("noPaymentsYet")}
              </p>
            ) : (
              <div className="space-y-2">
                {(projectPayments?.payments ?? []).map((payment: Payment) => (
                  <div key={payment.id} className="flex items-start justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 dark:border-emerald-900">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                        {formatCurrency(payment.amount, payment.currency)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5 flex flex-wrap gap-1.5">
                        <span>{format(new Date(payment.paymentDate), "dd/MM/yyyy")}</span>
                        {payment.paymentMethod && <span>· {payment.paymentMethod}</span>}
                        {payment.receiptNumber && <span>· #{payment.receiptNumber}</span>}
                      </div>
                      {payment.notes && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 italic truncate">{payment.notes}</p>
                      )}
                    </div>
                    {user?.role === "admin" && (
                      <button
                        onClick={() => onDeletePayment(payment.id)}
                        className="text-slate-300 hover:text-rose-500 dark:text-rose-400 transition-colors ml-2 flex-shrink-0 mt-0.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3 border-t border-border">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("totalCollected")}</span>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(projectPayments?.summary?.totalPaid ?? 0, projCurrency)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
