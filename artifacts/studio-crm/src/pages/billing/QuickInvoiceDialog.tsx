import React, { useState } from "react";
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
import { FileText, CheckCheck, Loader2, Printer } from "lucide-react";
import type { Client, Project } from "@workspace/api-client-react";

interface QuickInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClient: Client | null;
  services: { id: number | string; title: string; price: number }[];
  allProjects: Project[];
  onCreateInvoice: (data: {
    invoiceType: "proforma" | "final";
    newServiceId: string;
    newServicePrice: string;
    linkProjectId: string;
  }) => Promise<void>;
  isCreating: boolean;
}

export function QuickInvoiceDialog({
  open,
  onOpenChange,
  selectedClient,
  services,
  allProjects,
  onCreateInvoice,
  isCreating,
}: QuickInvoiceDialogProps) {
  const { t } = useLanguage();
  const [invoiceType, setInvoiceType] = useState<"proforma" | "final">("proforma");
  const [newServiceId, setNewServiceId] = useState<string>("");
  const [newServicePrice, setNewServicePrice] = useState<string>("");
  const [linkProjectId, setLinkProjectId] = useState<string>("");

  const handleCreate = async () => {
    await onCreateInvoice({ invoiceType, newServiceId, newServicePrice, linkProjectId });
  };

  const resetAndClose = () => {
    setInvoiceType("proforma");
    setNewServiceId("");
    setNewServicePrice("");
    setLinkProjectId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-bold text-slate-900 dark:text-slate-100">
            {t("newInvoice")}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            {selectedClient?.name}
          </DialogDescription>
        </DialogHeader>

        {selectedClient && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("invoiceType")}
              </Label>
              <Select
                value={invoiceType}
                onValueChange={(v) => setInvoiceType(v as "proforma" | "final")}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proforma">
                    <FileText className="h-4 w-4 inline mr-2 text-amber-600" />
                    {t("proformaInvoice")}
                  </SelectItem>
                  <SelectItem value="final">
                    <CheckCheck className="h-4 w-4 inline mr-2 text-emerald-600" />
                    {t("finalInvoice")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("addServiceItem")}
              </Label>
              <Select
                value={newServiceId}
                onValueChange={(v) => {
                  setNewServiceId(v);
                  const svc = services.find((s) => String(s.id) === v);
                  if (svc) setNewServicePrice(String(svc.price));
                  else setNewServicePrice("");
                  setLinkProjectId("");
                }}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t("selectService") as string} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("noService")}</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.title} — {s.price.toLocaleString()} DZD
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("costLabel")}
              </Label>
              <Input
                type="number"
                step="0.01"
                value={newServicePrice}
                onChange={(e) => setNewServicePrice(e.target.value)}
                placeholder="0.00"
                className="rounded-xl"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-900 px-2 text-muted-foreground">
                  {t("or")}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("linkExistingProject")}
              </Label>
              <Select
                value={linkProjectId}
                onValueChange={(v) => {
                  setLinkProjectId(v);
                  if (v) {
                    setNewServiceId("");
                    setNewServicePrice("");
                  }
                }}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t("selectProject") as string} />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const clientProjs = allProjects.filter(
                      (p) => p.clientId === selectedClient.id
                    );
                    return clientProjs.length === 0 ? (
                      <SelectItem value="none" disabled>
                        {t("noProjectsBilling")}
                      </SelectItem>
                    ) : (
                      clientProjs.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.title}
                        </SelectItem>
                      ))
                    );
                  })()}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={resetAndClose}
              >
                {t("cancel")}
              </Button>
              <Button
                className="rounded-xl gap-2"
                onClick={handleCreate}
                disabled={isCreating || (!newServicePrice && !linkProjectId)}
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                {t("createAndPrint")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
