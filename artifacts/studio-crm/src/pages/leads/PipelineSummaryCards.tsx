import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "./constants";

interface PipelineSummaryCardsProps {
  pipelineValue: number;
  pipelineCount: number;
  statusCounts: Record<string, number>;
}

export function PipelineSummaryCards({ pipelineValue, pipelineCount, statusCounts }: PipelineSummaryCardsProps) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-primary to-indigo-600 text-white border-0 shadow-md shadow-primary/20">
        <CardContent className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wider opacity-75 mb-1">{t("pipelineValue")}</div>
          <div className="text-2xl font-bold" dir="ltr">{formatCurrency(pipelineValue)}</div>
          <div className="text-xs opacity-75 mt-1" dir="ltr">{pipelineCount} {t("activeLeads")}</div>
        </CardContent>
      </Card>
      {[
        { labelKey: "new" as const, key: "new", color: "text-blue-600", bg: "bg-blue-50" },
        { labelKey: "negotiating" as const, key: "negotiating", color: "text-amber-600", bg: "bg-amber-50" },
        { labelKey: "won" as const, key: "won", color: "text-emerald-600", bg: "bg-emerald-50" },
      ].map((s) => (
        <Card key={s.key} className={`${s.bg} border-0 shadow-sm`}>
          <CardContent className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1">{t(s.labelKey)}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{statusCounts[s.key] ?? 0}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
