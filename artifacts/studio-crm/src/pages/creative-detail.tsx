import React, { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "wouter";
import {
  useGetUser,
  useUpdateUser,
  useListProjects,
  useListExpenses,
  getListUsersQueryKey,
  getGetUserQueryKey,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage, PROFESSION_KEY_MAP } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Camera, Edit3, Palette, Banknote, Briefcase,
  Save, Lock, CheckCircle2, Circle, DollarSign, XCircle, User,
} from "lucide-react";
import { format } from "date-fns";

const PROFESSION_LABELS: Record<string, string> = {
  photographer: "Photographer / مصور",
  editor: "Editor / محرر",
  designer: "Designer / مصمم",
  videographer: "Videographer / مصور فيديو",
  retoucher: "Retoucher / معدّل",
};

const PROFESSION_ICONS: Record<string, React.ComponentType<any>> = {
  photographer: Camera,
  editor: Edit3,
  designer: Palette,
};

function getAssignee(project: any, userId: number) {
  return (project.assignees ?? []).find((a: any) => a.id === userId);
}

export default function CreativeDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id!, 10);
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: creative, isLoading } = useGetUser(id);
  const { data: allProjects = [] } = useListProjects();
  const { data: expenses = [] } = useListExpenses();

  const updateUser = useUpdateUser();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [updatingInfo, setUpdatingInfo] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [paymentType, setPaymentType] = useState<string>("per_project");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [updatingPayment, setUpdatingPayment] = useState(false);

  const [commissions, setCommissions] = useState<Record<string, { commissionType: string; commissionValue: string }>>({});
  const [updatingCommission, setUpdatingCommission] = useState<string | null>(null);
  const [recordingExpense, setRecordingExpense] = useState<string | null>(null);
  const [removingFromProject, setRemovingFromProject] = useState<string | null>(null);

  // Sync once when creative loads
  useEffect(() => {
    if (!creative) return;
    setName(creative.name);
    setUsername(creative.username);
    const pt = (creative as any).paymentType ?? "per_project";
    setPaymentType(pt);
    setSalaryAmount((creative as any).salaryAmount ? String((creative as any).salaryAmount) : "");
  }, [!!creative]);

  // Derive creative's projects
  const creativeProjects = useMemo(() => {
    if (!creative) return [];
    return allProjects.filter((p: any) => {
      if (p.photographerId === creative.id) return true;
      return (p.assignees ?? []).some((a: any) => a.id === creative.id);
    });
  }, [allProjects, creative?.id]);

  // Build default commissions once when projects load
  useEffect(() => {
    const init: Record<string, { commissionType: string; commissionValue: string }> = {};
    for (const p of creativeProjects) {
      const a = getAssignee(p, id);
      if (a) {
        init[String(p.id)] = {
          commissionType: a.commissionType ?? "percentage",
          commissionValue: a.commissionValue != null ? String(a.commissionValue) : "",
        };
      }
    }
    setCommissions((prev) => {
      const merged = { ...init };
      for (const key of Object.keys(prev)) {
        if (merged[key]) merged[key] = prev[key];
      }
      return merged;
    });
  }, [creativeProjects.length, id]);

  const activeProjects = creativeProjects.filter((p: any) => p.status === "in_progress");
  const completedProjects = creativeProjects.filter((p: any) => p.status === "completed");

  const wasExpenseRecorded = (ref: string) => expenses.some((e: any) => e.reference === ref);

  const handleUpdateInfo = async () => {
    if (!name.trim() || !username.trim()) {
      toast({ variant: "destructive", description: t("nameAndUsernameRequired") });
      return;
    }
    setUpdatingInfo(true);
    try {
      await updateUser.mutateAsync({ id, data: { name, username } as any });
      qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
      qc.invalidateQueries({ queryKey: getGetUserQueryKey(id) });
      toast({ description: t("infoUpdated") });
    } catch {
      toast({ variant: "destructive", description: t("failedUsernameExists") });
    } finally {
      setUpdatingInfo(false);
    }
  };

  const handleChangePassword = async () => {
    if (!password || password.length < 4) {
      toast({ variant: "destructive", description: t("passwordMinLength") });
      return;
    }
    setUpdatingPassword(true);
    try {
      await updateUser.mutateAsync({ id, data: { password } as any });
      setPassword("");
      toast({ description: t("passwordUpdated") });
    } catch {
      toast({ variant: "destructive", description: t("failedToUpdatePassword") });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleUpdatePayment = async () => {
    setUpdatingPayment(true);
    try {
      await updateUser.mutateAsync({
        id,
        data: {
          paymentType,
          salaryAmount: paymentType === "monthly_salary" && salaryAmount ? parseFloat(salaryAmount) : null,
        } as any,
      });
      qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
      qc.invalidateQueries({ queryKey: getGetUserQueryKey(id) });
      toast({ description: t("paymentSettingsSaved") });
    } catch {
      toast({ variant: "destructive", description: t("failedToUpdatePayment") });
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleUpdateCommission = async (projectId: number) => {
    const comm = commissions[String(projectId)];
    if (!comm) return;
    setUpdatingCommission(String(projectId));
    try {
      const res = await fetch(`/api/projects/${projectId}/assignees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          commissionType: comm.commissionType,
          commissionValue: comm.commissionValue ? parseFloat(comm.commissionValue) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ description: t("commissionUpdated") });
    } catch {
      toast({ variant: "destructive", description: t("failedToUpdateCommission") });
    } finally {
      setUpdatingCommission(null);
    }
  };

  const handleRemoveFromProject = async (projectId: number) => {
    setRemovingFromProject(String(projectId));
    try {
      const res = await fetch(`/api/projects/${projectId}/assignees/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
      qc.invalidateQueries({ queryKey: getGetUserQueryKey(id) });
      qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      toast({ description: t("removedFromProject") });
    } catch {
      toast({ variant: "destructive", description: t("failedToRemoveFromProject") });
    } finally {
      setRemovingFromProject(null);
    }
  };

  const handleRecordExpense = async (type: "salary" | "commission", amount: number, projectId?: number, projectTitle?: string) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const refBase = `creative_payout_${id}`;
    const reference = projectId ? `${refBase}_project_${projectId}_${today}` : `${refBase}_salary_${today}`;
    const description = projectId
      ? `${creative?.name} — ${projectTitle ?? `Project #${projectId}`} — ${type === "commission" ? t("commissionExpense") : t("payoutExpense")}`
      : `${creative?.name} — ${t("monthlySalaryExpense")}`;

    setRecordingExpense(projectId ? String(projectId) : "salary");
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ category: "creative_payout", amount, date: today, description, reference }),
      });
      if (!res.ok) {
        if (res.status === 409) { toast({ description: t("alreadyRecordedToday") }); return; }
        throw new Error((await res.json()).error ?? "Failed");
      }
      qc.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ description: t("recordedAsExpense") });
    } catch {
      toast({ variant: "destructive", description: t("failedToRecordExpense") });
    } finally {
      setRecordingExpense(null);
    }
  };

  if (isLoading) return <div className="text-center py-12 text-muted-foreground animate-pulse">{t("loading")}</div>;
  if (!creative) return <div className="text-center py-12 text-muted-foreground">{t("creativeNotFound")}</div>;

  const profKey = (creative as any).profession ?? "";
  const ProfIcon = PROFESSION_ICONS[profKey] ?? Camera;
  const isSalaried = paymentType === "monthly_salary";
  const salaryNum = salaryAmount ? parseFloat(salaryAmount) : 0;
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const salaryRef = `creative_payout_${id}_salary_${todayStr}`;
  const salaryAlreadyRecorded = wasExpenseRecorded(salaryRef);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/photographers">
          <Button variant="ghost" size="sm" className="gap-1 rounded-xl"><ArrowLeft className="h-4 w-4" /> {t("back")}</Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xl bg-primary/10 text-primary flex-shrink-0">{name.charAt(0).toUpperCase()}</span>
            {name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{creative.email || username}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="text-xs font-medium border bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 rounded-lg px-2.5" variant="outline">
            <ProfIcon className="w-3 h-3 mr-1" />{profKey && PROFESSION_KEY_MAP[profKey] ? t(PROFESSION_KEY_MAP[profKey]) : profKey || t("profession")}
          </Badge>
          <Badge className={`text-xs font-medium border rounded-lg px-2.5 ${isSalaried ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" : "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"}`} variant="outline">
            {isSalaried ? <><Banknote className="w-3 h-3 mr-1" /> {t("monthlySalaryAmount")}</> : <><Briefcase className="w-3 h-3 mr-1" /> {t("perProjectDesc")}</>}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2"><User className="h-4 w-4" /> {t("basicInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("fullNameLabel")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("username")}</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} className="rounded-xl" />
            </div>
            <Button onClick={handleUpdateInfo} disabled={updatingInfo} className="gap-2 rounded-xl w-full" size="sm">
              <Save className="h-4 w-4" />{updatingInfo ? t("saving") : t("saveInfo")}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2"><Lock className="h-4 w-4" /> {t("changePassword")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("enterNewPassword")}</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("enterNewPassword")} className="rounded-xl" />
            </div>
            <Button onClick={handleChangePassword} disabled={updatingPassword || password.length < 4} className="gap-2 rounded-xl w-full" size="sm">
              <Save className="h-4 w-4" />{updatingPassword ? t("updating") : t("updatePassword")}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("profession")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("roleLabel")}</Label>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1 capitalize">
              {creative.profession === "photographer" ? t("profPhotographer") :
               creative.profession === "editor" ? t("profEditor") :
               creative.profession === "videographer" ? t("profVideographer") :
               creative.profession === "drone_operator" ? t("profDrone") :
               creative.profession === "retoucher" ? t("profRetoucher") :
               creative.profession === "designer" ? t("profDesigner") :
               creative.profession === "assistant" ? t("profAssistant") :
               creative.profession || "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2"><DollarSign className="h-4 w-4" /> {t("paymentSettings")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("paymentTypeLabel")}</Label>
              <Select value={paymentType} onValueChange={(v) => setPaymentType(v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_project"><div className="flex items-center gap-2"><Briefcase className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> {t("perProjectDesc")}</div></SelectItem>
                  <SelectItem value="monthly_salary"><div className="flex items-center gap-2"><Banknote className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> {t("monthlySalaryDesc")}</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentType === "monthly_salary" && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("monthlySalaryAmount")}</Label>
                <Input type="number" min="0" step="100" value={salaryAmount} onChange={(e) => setSalaryAmount(e.target.value)} placeholder={t("salaryPlaceholder")} className="rounded-xl" />
              </div>
            )}
          </div>
          <Button onClick={handleUpdatePayment} disabled={updatingPayment} className="gap-2 rounded-xl" size="sm">
            <Save className="h-4 w-4" />{updatingPayment ? t("saving") : t("save")}
          </Button>
          {isSalaried && salaryNum > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 dark:border-indigo-900">
              <div>
                <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">{t("monthlySalaryDisplay")}: {salaryNum.toLocaleString()}</p>
                <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">{t("recordSalaryExpense")}</p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 rounded-xl border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:bg-indigo-900"
                onClick={() => handleRecordExpense("salary", salaryNum)}
                disabled={recordingExpense === "salary" || salaryAlreadyRecorded}>
                {salaryAlreadyRecorded ? t("recordedToday") : recordingExpense === "salary" ? t("recordingExpense") : t("recordAsExpense")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Circle className="h-4 w-4 text-blue-500 dark:text-blue-400 fill-blue-500" /> {t("activeProjects")} ({activeProjects.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeProjects.length === 0 ? <p className="text-sm text-slate-400 dark:text-slate-500 italic py-2">{t("noActiveProjectsCreative")}</p>
          : activeProjects.map((project: any) => {
            const assignee = getAssignee(project, id);
            const comm = commissions[String(project.id)];
            return (
              <div key={project.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <Link href={`/projects/${project.id}`}><span className="text-sm font-bold text-primary hover:underline cursor-pointer">{project.title}</span></Link>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{project.clientName}</p>
                  </div>
                    <div className="flex items-center gap-2">
                     <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 rounded-lg">{t("in_progress")}</Badge>
                     {assignee && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-rose-400 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 dark:bg-rose-950 rounded-lg"
                          onClick={() => handleRemoveFromProject(project.id)} disabled={removingFromProject === String(project.id)}>
                          <XCircle className="h-3.5 w-3.5 mr-1" />{removingFromProject === String(project.id) ? "..." : t("removeButton")}
                       </Button>
                     )}
                   </div>
                </div>
                {assignee && (
                  <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{t("commissionSection")}</p>
                    <div className="flex items-center gap-2">
                      <Select value={comm?.commissionType ?? "percentage"}
                        onValueChange={(v) => setCommissions((f) => ({ ...f, [String(project.id)]: { ...f[String(project.id)], commissionType: v } }))}>
                        <SelectTrigger className="h-8 text-xs rounded-xl w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">{t("percentageOption")}</SelectItem>
                          <SelectItem value="fixed">{t("fixedAmountOption")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="number" step="0.01" min="0" value={comm?.commissionValue ?? ""}
                        onChange={(e) => setCommissions((f) => ({ ...f, [String(project.id)]: { ...f[String(project.id)], commissionValue: e.target.value } }))}
                        placeholder={comm?.commissionType === "percentage" ? "%" : t("amountPlaceholder")} className="h-8 text-xs rounded-xl w-28" />
                      <Button size="sm" variant="outline" className="h-8 text-xs rounded-xl"
                        onClick={() => handleUpdateCommission(project.id)} disabled={updatingCommission === String(project.id)}>
                        {updatingCommission === String(project.id) ? "..." : t("saveCommission")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-900 border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" /> {t("completed")} {t("projects")} ({completedProjects.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {completedProjects.length === 0 ? <p className="text-sm text-slate-400 dark:text-slate-500 italic py-2">{t("noCompletedProjects")}</p>
          : completedProjects.map((project: any) => {
            const assignee = getAssignee(project, id);
            const comm = commissions[String(project.id)];
            const commissionAmount = assignee?.commissionValue
              ? comm?.commissionType === "percentage" && project.finalCost
                ? (parseFloat(project.finalCost) * parseFloat(comm.commissionValue || assignee.commissionValue)) / 100
                : parseFloat(comm?.commissionValue ?? assignee.commissionValue ?? "0")
              : 0;
            const ref = `creative_payout_${id}_project_${project.id}_${todayStr}`;
            const alreadyRecorded = wasExpenseRecorded(ref);
            return (
              <div key={project.id} className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-100 dark:border-emerald-900">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Link href={`/projects/${project.id}`}><span className="text-sm font-bold text-emerald-800 dark:text-emerald-200 hover:underline cursor-pointer">{project.title}</span></Link>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{project.clientName}</p>
                    {project.finalCost && <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-500 mt-1">{t("finalCostDisplay")}: {Number(project.finalCost).toLocaleString()}</p>}
                  </div>
                  <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 rounded-lg flex-shrink-0">{t("completed")}</Badge>
                </div>
                {assignee && (
                  <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800 space-y-3">
                    <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{t("commissionSection")}</p>
                      <div className="flex items-center gap-2">
                        <Select value={comm?.commissionType ?? assignee.commissionType ?? "percentage"}
                          onValueChange={(v) => setCommissions((f) => ({ ...f, [String(project.id)]: { ...f[String(project.id)], commissionType: v } }))}>
                          <SelectTrigger className="h-8 text-xs rounded-xl w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                             <SelectItem value="percentage">{t("percentageOption")}</SelectItem>
                             <SelectItem value="fixed">{t("fixedAmountOption")}</SelectItem>
                           </SelectContent>
                         </Select>
                         <Input type="number" step="0.01" min="0" value={comm?.commissionValue ?? ""}
                           onChange={(e) => setCommissions((f) => ({ ...f, [String(project.id)]: { ...f[String(project.id)], commissionValue: e.target.value } }))}
                           placeholder={comm?.commissionType === "percentage" ? "%" : t("fixedFeeLabel")} className="h-8 text-xs rounded-xl w-28" />
                         <Button size="sm" variant="outline" className="h-8 text-xs rounded-xl"
                           onClick={() => handleUpdateCommission(project.id)} disabled={updatingCommission === String(project.id)}>
                           {updatingCommission === String(project.id) ? "..." : t("saveCommission")}
                         </Button>
                       </div>
                     </div>
                     {commissionAmount > 0 && (
                       <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
                         <div>
                           <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">{t("dueDisplay")}: {commissionAmount.toLocaleString()}</span>
                           <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">{comm?.commissionType === "percentage" ? t("commissionPercentLabel") : t("fixedFeeLabel")}</span>
                         </div>
                         <Button size="sm" variant="outline" className="h-7 text-xs gap-1 rounded-lg border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:bg-emerald-900"
                           onClick={() => handleRecordExpense("commission", commissionAmount, project.id, project.title)}
                           disabled={recordingExpense === String(project.id) || alreadyRecorded}>
                           {alreadyRecorded ? t("recordedToday") : recordingExpense === String(project.id) ? t("recordingExpense") : t("recordAsExpense")}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
