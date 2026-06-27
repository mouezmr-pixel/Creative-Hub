import React, { useState } from "react";
import { Link } from "wouter";
import {
  useGetAnalyticsSummary,
  useListProjects,
  useListLeads,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { DollarSign, Briefcase, TrendingUp, AlertCircle, Calendar, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, startOfMonth, subMonths } from "date-fns";
import { formatCurrency } from "@/lib/currency";

type DatePreset = "all" | "this_month" | "last_2_months" | "last_6_months" | "custom";

function getPresetDates(preset: DatePreset): { startDate?: string; endDate?: string } {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  if (preset === "all") return {};
  if (preset === "this_month") {
    return { startDate: format(startOfMonth(now), "yyyy-MM-dd"), endDate: today };
  }
  if (preset === "last_2_months") {
    return { startDate: format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd"), endDate: today };
  }
  if (preset === "last_6_months") {
    return { startDate: format(startOfMonth(subMonths(now, 5)), "yyyy-MM-dd"), endDate: today };
  }
  return {};
}

function CurrencyAmounts({
  amounts, colorClass = "text-slate-900",
}: {
  amounts: Record<string, number> | undefined;
  colorClass?: string;
}) {
  const entries = amounts
    ? Object.entries(amounts).filter(([, v]) => v > 0)
    : [];
  if (entries.length === 0)
    return <span className={`text-2xl font-bold ${colorClass}`}>—</span>;
  return (
    <div className="space-y-0.5">
      {entries.map(([cur, amt]) => (
        <div key={cur} className={`text-xl font-bold leading-tight ${colorClass}`}>
          {formatCurrency(amt, cur)}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const presetLabel = (p: DatePreset): string => {
    switch (p) {
      case "this_month": return t("thisMonth");
      case "last_2_months": return t("last2Months");
      case "last_6_months": return t("last6Months");
      case "custom": return t("customRange");
      default: return t("allTime");
    }
  };

  const [preset, setPreset] = useState<DatePreset>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const effectiveDates = preset === "custom"
    ? { startDate: customStart || undefined, endDate: customEnd || undefined }
    : getPresetDates(preset);

  const baseParams = user?.role === "photographer" ? { photographerId: user.id } : {};
  const analyticsParams = { ...baseParams, ...effectiveDates };

  const { data: analytics } = useGetAnalyticsSummary(analyticsParams as any);
  const { data: allProjects } = useListProjects(baseParams);
  const { data: ongoingProjects } = useListProjects({ ...baseParams, status: "in_progress" });
  const { data: completedProjects } = useListProjects({ ...baseParams, status: "completed" });

  const { data: leads = [] } = useListLeads();

  const currentMonth = new Date();
  const currentMonthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
  const wonThisMonth = leads.filter((l: any) => l.status === "won" && l.wonMonth === currentMonthStr);
  const wonValue = wonThisMonth.reduce((s: number, l: any) => s + (l.estimatedValue ?? 0), 0);
  const lostWithReason = leads.filter((l: any) => l.status === "lost" && l.lostReason);
  const lostReasonCounts: Record<string, number> = {};
  lostWithReason.forEach((l: any) => {
    lostReasonCounts[l.lostReason] = (lostReasonCounts[l.lostReason] || 0) + 1;
  });
  const lostReasonEntries = Object.entries(lostReasonCounts).sort(([, a], [, b]) => b - a);
  const totalLostCount = leads.filter((l: any) => l.status === "lost").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-50 text-amber-700 border-amber-200";
      case "in_progress": return "bg-blue-50 text-blue-700 border-blue-200";
      case "completed": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "archived": return "bg-slate-100 text-slate-600 border-slate-200";
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const ProjectList = ({ projects }: { projects: any[] | undefined }) => (
    <div className="space-y-3 mt-4">
      {!projects?.length ? (
        <div className="text-center py-12 text-muted-foreground bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-border">
          <Briefcase className="w-8 h-8 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium">{t("noDashboardProjects")}</p>
        </div>
      ) : (
        projects.map((project, index) => (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
            key={project.id}
          >
            <Link href={`/projects/${project.id}`}>
              <div className={`group flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all hover:shadow-sm hover:border-primary/20 bg-white dark:bg-slate-900 border-border hover:bg-slate-50/50`}>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">{project.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5 truncate">{project.clientName} · {project.photographerName}</p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-4 w-full md:w-auto">
                  <div className="flex-1 md:w-36">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">{t("progressLabel")}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{project.progress}%</span>
                    </div>
                    <Progress
                      value={project.progress}
                      className="h-1.5 bg-slate-100 dark:bg-slate-800"
                      indicatorClassName={project.progress === 100 ? "bg-emerald-500" : "bg-primary"}
                    />
                  </div>
                  <Badge className={`text-xs font-medium border rounded-lg px-2.5 ${getStatusBadge(project.status)}`}>
                    {t(project.status as any) || project.status}
                  </Badge>
                </div>
              </div>
            </Link>
          </motion.div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t("dashboard")}</h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">{t("welcome")}, {user?.name} 👋</p>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-xl h-9 text-sm border-border bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">
                <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                {presetLabel(preset)}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl w-48">
              {(["all", "this_month", "last_2_months", "last_6_months"] as DatePreset[]).map((p) => (
                <DropdownMenuItem
                  key={p}
                  onClick={() => { setPreset(p); setShowCustom(false); }}
                  className={`rounded-lg text-sm font-medium ${preset === p ? "text-primary bg-primary/5" : ""}`}
                >
                  {presetLabel(p)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { setPreset("custom"); setShowCustom(true); }}
                className={`rounded-lg text-sm font-medium ${preset === "custom" ? "text-primary bg-primary/5" : ""}`}
              >
                {t("customRange")}…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Custom date inputs */}
      {showCustom && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-sm"
        >
          <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider w-10">{t("from")}</label>
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-8 text-sm rounded-lg w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider w-6">{t("to")}</label>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-8 text-sm rounded-lg w-40"
            />
          </div>
          <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg text-slate-500 dark:text-slate-400 dark:text-slate-500" onClick={() => { setCustomStart(""); setCustomEnd(""); setPreset("all"); setShowCustom(false); }}>
            {t("clear")}
          </Button>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0, ease: [0.22, 1, 0.36, 1] }}>
          <Card className="bg-white dark:bg-slate-900 border-border shadow-sm hover:shadow-md transition-shadow h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("totalRevenue")}</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <CurrencyAmounts amounts={(analytics as any)?.totalRevenueByCurrency} colorClass="text-slate-900" />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t("finalCostDescription")}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Invoiced */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07, ease: [0.22, 1, 0.36, 1] }}>
          <Card className="bg-white dark:bg-slate-900 border-border shadow-sm hover:shadow-md transition-shadow h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("totalCollected")}</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <CurrencyAmounts amounts={(analytics as any)?.revenueByCurrency} colorClass="text-emerald-600" />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t("paymentsCollectedDescription")}</p>
            </CardContent>
          </Card>
        </motion.div>

{/* Projects */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21, ease: [0.22, 1, 0.36, 1] }}>
          <Card className="bg-white dark:bg-slate-900 border-border shadow-sm hover:shadow-md transition-shadow h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("projects")}</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{analytics?.totalProjects || 0}</div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{analytics?.ongoingProjects || 0} {t("ongoing").toLowerCase()}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Projects list */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-sm p-6">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">{t("projects")}</h2>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg text-sm">{t("all")}</TabsTrigger>
            <TabsTrigger value="ongoing" className="rounded-lg text-sm">{t("ongoing")}</TabsTrigger>
            <TabsTrigger value="completed" className="rounded-lg text-sm">{t("completed")}</TabsTrigger>

          </TabsList>
          <TabsContent value="all"><ProjectList projects={allProjects} /></TabsContent>
          <TabsContent value="ongoing"><ProjectList projects={ongoingProjects} /></TabsContent>
          <TabsContent value="completed"><ProjectList projects={completedProjects} /></TabsContent>

        </Tabs>
      </div>

      {/* Leads section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Won this month */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, ease: [0.22, 1, 0.36, 1] }}>
          <Card className="bg-white dark:bg-slate-900 border-border shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  {t("wonThisMonth")}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-3">
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{wonThisMonth.length}</div>
                <div className="text-lg font-semibold text-slate-700 dark:text-slate-300" dir="ltr">{formatCurrency(wonValue, "USD")}</div>
              </div>
              {wonThisMonth.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">{t("noWonThisMonth")}</p>
              ) : (
                <div className="space-y-1.5">
                  {wonThisMonth.slice(0, 6).map((l: any) => (
                    <div key={l.id} className="flex items-center justify-between text-sm py-1 px-2 rounded-lg bg-emerald-50/50">
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{l.name}</span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex-shrink-0 ml-2" dir="ltr">
                        {l.estimatedValue ? formatCurrency(l.estimatedValue, "USD") : "—"}
                      </span>
                    </div>
                  ))}
                  {wonThisMonth.length > 6 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center pt-1">+{wonThisMonth.length - 6} {t("more")}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Lost reasons */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, ease: [0.22, 1, 0.36, 1] }}>
          <Card className="bg-white dark:bg-slate-900 border-border shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                  {t("lostReasons")}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">{totalLostCount}</div>
                <span className="text-sm text-slate-400 dark:text-slate-500">{t("totalLost")}</span>
              </div>
              {lostReasonEntries.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">{t("noLostReasons")}</p>
              ) : (
                <div className="space-y-2">
                  {lostReasonEntries.map(([reason, count]) => {
                    const maxCount = lostReasonEntries[0][1];
                    const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                      <div key={reason} className="space-y-0.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-700 dark:text-slate-300 truncate">{reason}</span>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 flex-shrink-0 ml-2">{count}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-rose-400 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
