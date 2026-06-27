import React, { useCallback, useRef } from "react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Printer } from "lucide-react";
import { InvoiceDocument } from "@/components/invoice-document";
import type { InvoiceProjectData, InvoiceStudioData, InvoiceDocType } from "@/components/invoice-document";
import type { Project } from "@workspace/api-client-react";

interface InvoicePreview {
  type: InvoiceDocType;
  project: Project;
}

interface InvoicePreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoicePreview: InvoicePreview | null;
  studioInvoiceData: InvoiceStudioData;
}

export function InvoicePreviewSheet({
  open,
  onOpenChange,
  invoicePreview,
  studioInvoiceData,
}: InvoicePreviewSheetProps) {
  const { t } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    const content = printRef.current;
    if (!content) return;
    const printRoot = document.getElementById("print-root");
    if (!printRoot) return;
    const clone = content.cloneNode(true);
    printRoot.innerHTML = "";
    printRoot.appendChild(clone);
    window.print();
    setTimeout(() => { printRoot.innerHTML = ""; }, 5000);
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[800px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {invoicePreview?.type === "proforma"
              ? t("invoiceProFormaTitle")
              : invoicePreview?.type === "final"
                ? t("invoiceFinalTitle")
                : t("paymentReceiptTitle")}
          </SheetTitle>
          <SheetDescription>
            {invoicePreview?.project.clientName}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex justify-end gap-2 mb-4">
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" />
            {t("printLabel")}
          </Button>
        </div>
        <div ref={printRef}>
          {invoicePreview && (
            <InvoiceDocument
              type={invoicePreview.type}
              project={invoicePreview.project as unknown as InvoiceProjectData}
              studio={studioInvoiceData}
              t={t}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
