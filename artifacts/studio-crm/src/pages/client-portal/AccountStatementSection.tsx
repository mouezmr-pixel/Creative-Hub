import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet } from "lucide-react";
import { format } from "date-fns";

export function AccountStatementSection({ projects }: { projects: any[] }) {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const canSeeFinancials = (user as any)?.canViewFinancials === true;

  const { data: clientPayments } = useQuery({
    queryKey: ["client-payments"],
    queryFn: async () => {
      const res = await fetch("/api/payments/client");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: canSeeFinancials,
  });

  const projectsWithFinancials = projects.filter(
    (p: any) => p.finalCost != null || p.amountPaid != null || p.remainingDebt != null
  );

  if (!canSeeFinancials || (projectsWithFinancials.length === 0 && !clientPayments?.payments?.length)) {
    return null;
  }

  function fmt(n: number) {
    return n.toLocaleString(isRTL ? "ar-DZ" : "en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  const summary = clientPayments?.summary;
  const allPayments = (clientPayments?.payments ?? []) as any[];
  const paymentsByProject: Record<number, any[]> = {};
  for (const pm of allPayments) {
    if (!paymentsByProject[pm.projectId]) paymentsByProject[pm.projectId] = [];
    paymentsByProject[pm.projectId].push(pm);
  }

  return (
    <div id="account-statement" className="space-y-4">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t("accountStatement")}</h2>
      </div>

      {summary && summary.projectCount > 0 && (
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950 dark:to-emerald-900/50 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{t("totalCost")}</p>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100" dir="ltr">{fmt(summary.totalCost)}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{t("paid")}</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">{fmt(summary.totalPaid)}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{t("remaining")}</p>
                <p className={`text-xl font-bold ${summary.totalRemaining > 0 ? "text-rose-500 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`} dir="ltr">
                  {fmt(summary.totalRemaining)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {projectsWithFinancials.map((project: any) => {
          const finalCost = project.finalCost ?? 0;
          const amountPaid = project.amountPaid ?? 0;
          const remaining = project.remainingDebt ?? Math.max(0, finalCost - amountPaid);
          const paidPct = finalCost > 0 ? Math.min(100, Math.round((amountPaid / finalCost) * 100)) : 0;
          const currency = project.currency ?? "DZD";
          const projectPayments = paymentsByProject[project.id] ?? [];

          return (
            <Card key={project.id} className="border-emerald-100 dark:border-emerald-900">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">{project.title}</h3>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-emerald-100 dark:border-emerald-900 p-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t("totalCost")}</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm" dir="ltr">{fmt(finalCost)}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{currency}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-emerald-100 dark:border-emerald-900 p-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t("paid")}</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm" dir="ltr">{fmt(amountPaid)}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{currency}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-emerald-100 dark:border-emerald-900 p-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t("remaining")}</p>
                    <p className={`font-bold text-sm ${remaining > 0 ? "text-rose-500 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`} dir="ltr">
                      {fmt(remaining)}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{currency}</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1.5 font-medium">
                    <span>{t("paymentProgress")}</span>
                    <span dir="ltr">{paidPct}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-emerald-100 dark:bg-emerald-900 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${paidPct === 100 ? "bg-emerald-500" : "bg-emerald-400"}`}
                      style={{ width: `${paidPct}%` }}
                    />
                  </div>
                  {paidPct === 100 && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1.5 text-center">
                      {t("fullyPaidMsg")}
                    </p>
                  )}
                </div>

                {projectPayments.length > 0 && (
                  <div className="border-t border-emerald-100 dark:border-emerald-900 pt-3">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t("paymentHistory")}</h4>
                    <div className="space-y-1.5">
                      {projectPayments.map((pm: any) => (
                        <div key={pm.id} className="flex items-center justify-between text-sm bg-white dark:bg-slate-900 rounded-lg px-3 py-2 border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs text-muted-foreground" dir="ltr">
                              {format(new Date(pm.paymentDate), "MMM d, yyyy")}
                            </span>
                            {pm.paymentMethod && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                                {pm.paymentMethod}
                              </Badge>
                            )}
                          </div>
                          <span className="font-medium text-emerald-600 dark:text-emerald-400" dir="ltr">
                            +{fmt(pm.amount)} {pm.currency || currency}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
