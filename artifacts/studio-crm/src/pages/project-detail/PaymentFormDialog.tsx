import React, { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CreditCard } from "lucide-react";

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isPending: boolean;
}

export function PaymentFormDialog({ open, onOpenChange, onSubmit, isPending }: PaymentFormDialogProps) {
  const { t } = useLanguage();
  const [paymentForm, setPaymentForm] = useState({
    amount: "", currency: "DZD", paymentMethod: "", receiptNumber: "",
    paymentDate: new Date().toISOString().split("T")[0], notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    await onSubmit(e);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            {t("recordPayment")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("paymentAmount")}</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder={t("costPlaceholder")}
                className="rounded-xl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("currencyLabel")}</Label>
              <Select
                value={paymentForm.currency}
                onValueChange={(v) => setPaymentForm((f) => ({ ...f, currency: v }))}
              >
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="DZD" className="rounded-lg">🇩🇿 DZD</SelectItem>
                  <SelectItem value="USD" className="rounded-lg">🇺🇸 USD</SelectItem>
                  <SelectItem value="EUR" className="rounded-lg">🇪🇺 EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("paymentDate")}</Label>
            <Input
              type="date"
              value={paymentForm.paymentDate}
              onChange={(e) => setPaymentForm((f) => ({ ...f, paymentDate: e.target.value }))}
              className="rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("paymentMethod")}</Label>
              <Select
                value={paymentForm.paymentMethod || "_none"}
                onValueChange={(v) => setPaymentForm((f) => ({ ...f, paymentMethod: v === "_none" ? "" : v }))}
              >
                <SelectTrigger className="rounded-xl"><SelectValue placeholder={t("optionalLabel")} /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="_none" className="rounded-lg">{t("noMethod")}</SelectItem>
                  <SelectItem value="cash" className="rounded-lg">{t("cash")}</SelectItem>
                  <SelectItem value="bank_transfer" className="rounded-lg">{t("bankTransfer")}</SelectItem>
                  <SelectItem value="check" className="rounded-lg">{t("check")}</SelectItem>
                  <SelectItem value="ccp" className="rounded-lg">{t("ccp")}</SelectItem>
                  <SelectItem value="baridi_mob" className="rounded-lg">{t("baridiMob")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("receiptNumber")}</Label>
              <Input
                value={paymentForm.receiptNumber}
                onChange={(e) => setPaymentForm((f) => ({ ...f, receiptNumber: e.target.value }))}
                placeholder={t("optionalLabel")}
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("notes")}</Label>
            <Input
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder={t("optionalNote")}
              className="rounded-xl"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600" disabled={isPending}>
              {isPending ? t("savingEllipsis") : t("recordPayment")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
