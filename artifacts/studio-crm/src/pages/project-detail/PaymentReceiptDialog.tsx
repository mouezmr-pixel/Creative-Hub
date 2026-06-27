import React from "react";
import { useLanguage } from "@/lib/i18n";
import { useStudio } from "@/lib/use-studio";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { InvoiceDocument } from "@/components/invoice-document";
import { Printer } from "lucide-react";

interface PaymentReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: any;
  onPrint: () => void;
}

export function PaymentReceiptDialog({ open, onOpenChange, project, onPrint }: PaymentReceiptDialogProps) {
  const { t } = useLanguage();
  const {
    studioName, studioDescription, studioAddress, studioPhone, studioEmail,
    studioWebsite, studioTaxId, invoicePrefix, proformaPrefix,
    paymentTerms, invoiceFooter, invoiceNotes,
    studioLogoUrl, studioStampUrl, showStamp, showSignature,
  } = useStudio();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-3 bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800 shrink-0">
          <div>
            <DialogTitle className="text-base font-bold text-blue-900 dark:text-blue-200">{t("paymentReceiptTitle")}</DialogTitle>
            <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">{t("receiptDescription")}</p>
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="gap-1 rounded-lg text-[11px] h-8 px-2.5" onClick={onPrint}>
              <Printer className="w-3 h-3" /> {t("printLabel")}
            </Button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950 p-4 md:p-6">
          <InvoiceDocument
            type="receipt"
            project={project}
            studio={{
              studioName, studioDescription, studioAddress, studioPhone, studioEmail,
              studioWebsite, studioTaxId, invoicePrefix, proformaPrefix,
              paymentTerms, invoiceFooter, invoiceNotes,
              studioLogoUrl, studioStampUrl, showStamp, showSignature,
            }}
            t={t}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
