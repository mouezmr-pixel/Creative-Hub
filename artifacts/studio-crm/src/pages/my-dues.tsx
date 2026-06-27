import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Banknote, Briefcase, Wallet, CheckCircle2, Clock, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

export default function MyDues() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/accounting/my-dues", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-muted-foreground animate-pulse">{t("loading")}</div>;
  if (!data) return <div className="text-center py-12 text-muted-foreground">{t("noData")}</div>;

  const isSalaried = data.paymentType === "monthly_salary";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
            <Wallet className="h-6 w-6 text-primary" />
            {t("myDuesTitle")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("myDuesSubtitle")}</p>
        </div>
      </div>

      {/* Payment Method Card */}
      <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Wallet className="h-4 w-4" /> {t("duesPaymentMethod")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {isSalaried ? (
              <>
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t("monthlySalaryLabel")}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{data.salaryAmount?.toLocaleString()}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t("perProjectLabel")}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{t("selfServiceDues")}</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      <Card className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white border-0 shadow-md shadow-violet-200">
        <CardContent className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-75">{t("dueThisMonth")}</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(data.totalDueThisMonth, "DZD")}</p>
          <p className="text-xs opacity-70 mt-1">{format(new Date(), "MMMM yyyy")}</p>
        </CardContent>
      </Card>

      {/* Salary Status (if salaried) */}
      {isSalaried && data.monthlySalary && (
        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Banknote className="h-4 w-4" /> {t("salaryStatus")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t("monthlySalaryLabel")}</p>
                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1">{formatCurrency(data.monthlySalary.amount, "DZD")}</p>
              </div>
              <Badge className={`text-xs font-medium border rounded-lg px-3 py-1.5 ${data.monthlySalary.recorded ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" : "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"}`}>
                {data.monthlySalary.recorded ? (
                  <><CheckCircle2 className="w-3 h-3 mr-1" />{t("salaryRecorded")}</>
                ) : (
                  <><Clock className="w-3 h-3 mr-1" />{t("salaryNotRecorded")}</>
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Commissions (if per-project) */}
      {!isSalaried && data.projects && data.projects.length > 0 && (
        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> {t("projectCommissions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.projects
              .filter((p: any) => p.status === "completed" || p.status === "in_progress" || p.status === "pending")
              .map((project: any) => (
                <div key={project.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link href={`/projects/${project.id}`}>
                        <span className="text-sm font-bold text-primary hover:underline cursor-pointer">{project.title}</span>
                      </Link>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {project.commissionType === "percentage" ? t("commissionPercent") : t("flatFee")}
                        {project.commissionValue ? `: ${project.commissionValue}${project.commissionType === "percentage" ? "%" : ""}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-xs border rounded-lg ${
                      project.status === "completed"
                        ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        : project.status === "in_progress"
                        ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}>
                      {t(project.status)}
                    </Badge>
                  </div>
                  {project.calculatedFee != null && (
                    <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{t("dueDisplay")}</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(project.calculatedFee, "DZD")}</span>
                    </div>
                  )}
                  {project.finalCost && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {t("finalCostDisplay")} {formatCurrency(project.finalCost, "DZD")}
                    </p>
                  )}
                </div>
              ))}
            {data.projects.filter((p: any) => p.status === "completed" || p.status === "in_progress" || p.status === "pending").length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic py-2">{t("noDuesThisMonth")}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Payouts */}
      {data.recentPayouts && data.recentPayouts.length > 0 && (
        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4" /> {t("recentPayouts")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {data.recentPayouts.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.description || t("payoutExpense")}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{p.date}</p>
                  </div>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{formatCurrency(p.amount, "DZD")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(!data.recentPayouts || data.recentPayouts.length === 0) && (
        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
          <CardContent className="py-8 text-center text-slate-400 dark:text-slate-500">
            <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t("noPayoutsYet")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}