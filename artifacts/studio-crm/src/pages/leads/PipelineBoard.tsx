import { useLanguage } from "@/lib/i18n";
import { useListLeads } from "@workspace/api-client-react";
import { AnimatePresence } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { STATUS_CONFIG, formatCurrency, getCurrentMonth } from "./constants";
import { LeadCard } from "./LeadCard";

const currentMonth = getCurrentMonth();

interface PipelineBoardProps {
  leads: any[];
  isLoading: boolean;
}

export function PipelineBoard({ leads, isLoading }: PipelineBoardProps) {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1,2,3,4].map((i) => <div key={i} className="h-60 min-w-[260px] bg-white dark:bg-slate-900 border rounded-2xl animate-pulse flex-shrink-0" />)}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 border border-dashed border-border rounded-2xl">
        <TrendingUp className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <p className="text-base font-semibold text-slate-700 dark:text-slate-300">{t("noActiveLeads")}</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{t("addFirstLead")}</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollBehavior: "smooth" }}>
      {(["new", "contacted", "proposal_sent", "negotiating", "won"] as const).map((status) => {
        const columnLeads = (status === "won")
          ? leads.filter((l: any) => l.status === "won" && l.wonMonth === currentMonth)
          : leads.filter((l: any) => l.status === status);
        const allWon = leads.filter((l: any) => l.status === "won");
        const prevWonCount = allWon.length - columnLeads.length;
        const cfg = STATUS_CONFIG[status];
        const columnValue = columnLeads.reduce((sum: number, l: any) => sum + (l.estimatedValue ?? 0), 0);
        return (
          <div key={status} className="min-w-[270px] max-w-[320px] flex-shrink-0">
            <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-sm flex flex-col h-full" style={{ maxHeight: "calc(100vh - 280px)" }}>
              <div className={`sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b border-border rounded-t-2xl ${status === "won" ? "bg-emerald-50 dark:bg-emerald-950" : "bg-white dark:bg-slate-900"}`}>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.color.replace("text-", "bg-").split(" ")[0]}`} />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex-1">{t(status === "proposal_sent" ? "proposalSent" : status)}</span>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{columnLeads.length}</span>
                {status === "won" && prevWonCount > 0 && (
                  <span className="text-[9px] text-slate-400 dark:text-slate-500">(+{prevWonCount} {t("prevMonths")})</span>
                )}
                {columnValue > 0 && <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400" dir="ltr">{formatCurrency(columnValue)}</span>}
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <AnimatePresence>
                  {columnLeads.length === 0 ? (
                    <div className="text-center py-8 text-slate-300">
                      <p className="text-xs italic">{t("dropLeadsHere")}</p>
                    </div>
                  ) : (
                    columnLeads.map((lead: any, i: number) => (
                      <LeadCard key={lead.id} lead={lead} index={i} />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
