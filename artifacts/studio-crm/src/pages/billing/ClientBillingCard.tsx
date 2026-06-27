import React, { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Phone,
  Plus,
  Wallet,
  FileText,
  CheckCheck,
  Receipt as ReceiptIcon,
} from "lucide-react";
import type { Project, Client } from "@workspace/api-client-react";
import type { InvoiceDocType } from "@/components/invoice-document";
import { formatCurrency } from "@/lib/currency";
import { useLanguage } from "@/lib/i18n";

interface ClientWithProjects {
  client: Client;
  projects: Project[];
  totalDebt: number;
  totalPaid: number;
  totalCost: number;
  projectCount: number;
  hasDebt: boolean;
  isFullyPaid: boolean;
}

interface ClientBillingCardProps {
  cw: ClientWithProjects;
  onQuickInvoice: () => void;
  onPrintExisting: (type: InvoiceDocType, project: Project) => void;
  onRecordPayment: (project: Project) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending": return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800";
    case "in_progress": return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800";
    case "completed": return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800";
    default: return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400";
  }
};

export function ClientBillingCard({
  cw,
  onQuickInvoice,
  onPrintExisting,
  onRecordPayment,
}: ClientBillingCardProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="bg-white dark:bg-slate-900 border-border shadow-sm transition-all">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-base truncate">
                  {cw.client.name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {cw.client.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {cw.client.phone}
                    </span>
                  )}
                  <span>{cw.projectCount} {t("projectsCount")}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            {cw.totalCost > 0 && (
              <>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">
                    {t("totalCollectedLabel")}
                  </div>
                  <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(cw.totalPaid, "DZD")}
                  </div>
                </div>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5"
              onClick={onQuickInvoice}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("newInvoice")}
            </Button>
            {cw.projects.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? t("cancel") : t("all")} ({cw.projects.length})
              </Button>
            )}
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-2 border-t border-border pt-3">
            {cw.projects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("noProjectsBilling")}
              </p>
            ) : (
              cw.projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-medium text-sm hover:text-primary transition-colors"
                    >
                      {project.title}
                    </Link>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{project.serviceName || t("notAvailable")}</span>
                      {project.finalCost && project.finalCost > 0 && (
                        <span>
                          {formatCurrency(project.finalCost, project.currency ?? "DZD")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={getStatusColor(project.status)}
                    >
                      {t(project.status as any) || project.status}
                    </Badge>

                    <div className="flex gap-1">
                      <button
                        onClick={() => onRecordPayment(project)}
                        className="p-1.5 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/50 text-violet-600 dark:text-violet-400 transition-colors"
                        title={t("recordPayment")}
                      >
                        <Wallet className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onPrintExisting("proforma", project)}
                        className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-600 dark:text-amber-400 transition-colors"
                        title={t("proformaInvoice")}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onPrintExisting("final", project)}
                        className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 transition-colors"
                        title={t("finalInvoice")}
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onPrintExisting("receipt", project)}
                        className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 transition-colors"
                        title={t("receipt")}
                      >
                        <ReceiptIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { ClientWithProjects };
