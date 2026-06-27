import { useLanguage } from "@/lib/i18n";
import { Archive } from "lucide-react";
import { format } from "date-fns";

interface LostLeadsArchiveProps {
  leads: any[];
}

export function LostLeadsArchive({ leads }: LostLeadsArchiveProps) {
  const { t } = useLanguage();

  const lostLeads = leads.filter((l: any) => l.status === "lost");

  if (lostLeads.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-sm">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Archive className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t("archive")}</span>
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
          {lostLeads.length}
        </span>
      </div>
      <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
        {lostLeads.map((lead: any) => (
          <div key={lead.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold text-sm flex-shrink-0">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{lead.name}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">{lead.source}</span>
              </div>
              {lead.lostReason && (
                <p className="text-xs text-rose-500 dark:text-rose-400 font-medium mt-0.5">{lead.lostReason}</p>
              )}
              {(lead.phone || lead.email) && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5" dir="ltr">
                  {lead.phone}{lead.phone && lead.email ? " · " : ""}{lead.email}
                </p>
              )}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0">
              {format(new Date(lead.createdAt), "MMM d")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
