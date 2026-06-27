import { useState, useMemo } from "react";
import { useListLeads } from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";
import { TrendingUp } from "lucide-react";
import { STATUS_CONFIG } from "./constants";
import { LeadFormDialog } from "./LeadFormDialog";
import { PipelineSummaryCards } from "./PipelineSummaryCards";
import { PipelineBoard } from "./PipelineBoard";
import { LostLeadsArchive } from "./LostLeadsArchive";

export default function Leads() {
  const { t } = useLanguage();
  const { data: leads = [], isLoading } = useListLeads();

  const [open, setOpen] = useState(false);

  const pipelineLeads = useMemo(() => leads.filter((l: any) => l.status !== "won" && l.status !== "lost"), [leads]);
  const pipelineValue = useMemo(() => pipelineLeads.reduce((sum: number, l: any) => sum + (l.estimatedValue ?? 0), 0), [pipelineLeads]);

  const statusCounts = useMemo(() => Object.keys(STATUS_CONFIG).reduce((acc: Record<string, number>, s) => {
    acc[s] = leads.filter((l: any) => l.status === s).length;
    return acc;
  }, {}), [leads]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            {t("leadsPipeline")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1" dir="ltr">{leads.length} {t("total")} · {pipelineLeads.length} {t("activeLeads")}</p>
        </div>
        <LeadFormDialog open={open} onOpenChange={setOpen} />
      </div>

      <PipelineSummaryCards
        pipelineValue={pipelineValue}
        pipelineCount={pipelineLeads.length}
        statusCounts={statusCounts}
      />

      <PipelineBoard leads={leads} isLoading={isLoading} />

      <LostLeadsArchive leads={leads} />
    </div>
  );
}
