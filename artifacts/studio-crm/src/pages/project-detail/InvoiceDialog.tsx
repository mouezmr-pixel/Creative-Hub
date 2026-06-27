import React from "react";
import { useLanguage } from "@/lib/i18n";
import { useStudio } from "@/lib/use-studio";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { InvoiceDocument } from "@/components/invoice-document";
import { FileText, Printer, MessageCircle, Mail, CheckCheck } from "lucide-react";

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceType: "proforma" | "final";
  project: any;
  onPrint: () => void;
  onWhatsApp: () => void;
  onEmail: () => void;
  onIssueInvoice: () => Promise<void>;
  isIssuingInvoice: boolean;
}

export function InvoiceDialog({
  open,
  onOpenChange,
  invoiceType,
  project,
  onPrint,
  onWhatsApp,
  onEmail,
  onIssueInvoice,
  isIssuingInvoice,
}: InvoiceDialogProps) {
  const { t } = useLanguage();
  const {
    studioName, studioDescription, studioAddress, studioPhone, studioEmail,
    studioWebsite, studioTaxId, invoicePrefix, proformaPrefix,
    paymentTerms, invoiceFooter, invoiceNotes,
    studioLogoUrl, studioStampUrl, showStamp, showSignature,
  } = useStudio();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl rounded-2xl p-0 overflow-hidden max-h-[95vh] flex flex-col">
        <div className={`flex items-center justify-between px-6 py-3 border-b shrink-0 ${invoiceType === "proforma" ? "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800" : "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800"}`}>
          <div className="min-w-0">
            <DialogTitle className={`text-base font-bold truncate ${invoiceType === "proforma" ? "text-amber-800 dark:text-amber-200" : "text-emerald-800 dark:text-emerald-200"}`}>
              {invoiceType === "proforma" ? t("invoiceProFormaTitle") : t("invoiceFinalTitle")}
            </DialogTitle>
            <p className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400 truncate">
              {invoiceType === "proforma" ? t("proFormaNote") : t("finalInvoiceNote")}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
            <Button variant="outline" size="sm" className="gap-1 rounded-lg text-[11px] h-8 px-2.5" onClick={onPrint}>
              <Printer className="w-3 h-3" /> {t("printLabel")}
            </Button>
            <Button variant="outline" size="sm" className="gap-1 rounded-lg text-[11px] h-8 px-2.5 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" onClick={onWhatsApp}>
              <MessageCircle className="w-3 h-3" /> {t("whatsapp")}
            </Button>
            <Button variant="outline" size="sm" className="gap-1 rounded-lg text-[11px] h-8 px-2.5 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800" onClick={onEmail}>
              <Mail className="w-3 h-3" /> {t("emailLabel")}
            </Button>
            <Button
              size="sm"
              className={`gap-1 rounded-lg text-[11px] font-semibold h-8 px-3 ${invoiceType === "proforma" ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
              onClick={onIssueInvoice}
              disabled={isIssuingInvoice || (invoiceType === "proforma" ? !!project?.proformaIssuedAt : !!project?.finalInvoiceIssuedAt)}
            >
              {invoiceType === "proforma" ? <FileText className="w-3 h-3" /> : <CheckCheck className="w-3 h-3" />}
              {(invoiceType === "proforma" ? !!project?.proformaIssuedAt : !!project?.finalInvoiceIssuedAt)
                ? t("alreadyIssued")
                : isIssuingInvoice
                  ? t("issuing")
                  : invoiceType === "proforma" ? t("issueProForma") : t("issueFinalInvoice")}
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950 p-4 md:p-6">
          <InvoiceDocument
            type={invoiceType}
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
