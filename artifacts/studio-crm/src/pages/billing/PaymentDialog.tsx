import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Wallet } from "lucide-react";
import { format } from "date-fns";
import type { Project } from "@workspace/api-client-react";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentTarget: Project | null;
  isPending: boolean;
  onRecordPayment: (data: {
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    receiptNumber: string;
    notes: string;
  }) => Promise<void>;
}

export function PaymentDialog({
  open,
  onOpenChange,
  paymentTarget,
  isPending,
  onRecordPayment,
}: PaymentDialogProps) {
  const { t } = useLanguage();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentReceipt, setPaymentReceipt] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  useEffect(() => {
    if (paymentTarget) {
      setPaymentAmount(String(paymentTarget.remainingDebt ?? ""));
      setPaymentMethod("cash");
      setPaymentDate(format(new Date(), "yyyy-MM-dd"));
      setPaymentReceipt("");
      setPaymentNotes("");
    }
  }, [paymentTarget]);

  const handleSubmit = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) return;
    await onRecordPayment({
      amount,
      paymentMethod,
      paymentDate,
      receiptNumber: paymentReceipt,
      notes: paymentNotes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-bold text-slate-900 dark:text-slate-100">
            {t("recordPayment")}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            {paymentTarget?.title} — {paymentTarget?.clientName}
          </DialogDescription>
        </DialogHeader>

        {paymentTarget && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("paymentAmount")}
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("paymentMethod")}
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("cash")}</SelectItem>
                  <SelectItem value="bank_transfer">{t("bankTransfer")}</SelectItem>
                  <SelectItem value="check">{t("check")}</SelectItem>
                  <SelectItem value="ccp">{t("ccp")}</SelectItem>
                  <SelectItem value="baridi_mob">{t("baridiMob")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("paymentDate")}
              </Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("receiptNumber")}
                <span className="text-xs text-muted-foreground ml-1">({t("optionalLabel")})</span>
              </Label>
              <Input
                value={paymentReceipt}
                onChange={(e) => setPaymentReceipt(e.target.value)}
                placeholder={t("optionalLabel")}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("notes")}
                <span className="text-xs text-muted-foreground ml-1">({t("optionalLabel")})</span>
              </Label>
              <Input
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder={t("optionalNote")}
                className="rounded-xl"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => onOpenChange(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                className="rounded-xl gap-2"
                onClick={handleSubmit}
                disabled={isPending || !paymentAmount || parseFloat(paymentAmount) <= 0}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="h-4 w-4" />
                )}
                {isPending ? t("recording") : t("recordPayment")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
