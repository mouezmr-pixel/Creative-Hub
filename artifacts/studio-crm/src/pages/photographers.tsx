import React, { useState } from "react";
import { Link } from "wouter";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useListProjects,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage, PROFESSION_KEY_MAP } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, Archive, ChevronDown, Shield, Camera, Edit3, Palette, Banknote, Briefcase, ArchiveRestore, ChevronRight } from "lucide-react";

const PROFESSIONS = [
  { value: "photographer", label: "Photographer / مصور" },
  { value: "editor", label: "Editor / محرر" },
  { value: "designer", label: "Designer / مصمم" },
  { value: "videographer", label: "Videographer / مصور فيديو" },
  { value: "retoucher", label: "Retoucher / معدّل" },
  { value: "custom", label: "Custom / مخصص" },
];

const PROFESSION_ICONS: Record<string, React.ComponentType<any>> = {
  photographer: Camera,
  editor: Edit3,
  designer: Palette,
};

const PROFESSION_COLORS: Record<string, string> = {
  photographer: "bg-blue-50 text-blue-700 border-blue-200",
  editor: "bg-violet-50 text-violet-700 border-violet-200",
  designer: "bg-pink-50 text-pink-700 border-pink-200",
};

function CreativeCard({ creative, index }: { creative: any; index: number }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const updateUser = useUpdateUser();
  const archiveUser = useDeleteUser();
  const [permOpen, setPermOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const { data: projects = [] } = useListProjects({ photographerId: creative.id });
  const activeProjects = projects.filter((p: any) => p.status === "in_progress");

  const isArchived = !!creative.archivedAt;
  const ProfIcon = PROFESSION_ICONS[creative.profession] ?? Camera;
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const res = await fetch(`/api/users/${creative.id}/unarchive`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ description: t("accountRestored") });
    } catch {
      toast({ variant: "destructive", description: t("failedToRestore") });
    } finally {
      setIsRestoring(false);
    }
  };

  const togglePermission = async (key: string, value: boolean) => {
    try {
      await updateUser.mutateAsync({ id: creative.id, data: { [key]: value } as any });
      qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } catch {
      toast({ variant: "destructive", description: t("failedToUpdate") });
    }
  };

  const handleArchive = async () => {
    try {
      await archiveUser.mutateAsync({ id: creative.id });
      qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({
        description: t("accountArchived"),
      });
      setConfirmArchive(false);
    } catch {
      toast({ variant: "destructive", description: t("failedToArchive") });
    }
  };

  const professionLabel = creative.profession
    ? (PROFESSION_KEY_MAP[creative.profession]
      ? t(PROFESSION_KEY_MAP[creative.profession])
      : creative.profession)
    : t("profession");
  const profColor = PROFESSION_COLORS[creative.profession] ?? "bg-slate-50 text-slate-700 border-slate-200";
  const isSalaried = (creative as any).paymentType === "monthly_salary";

  const permissions = [
    { key: "canViewFinancials", label: t("viewFinancials"), description: t("permissionDescFinancials"), value: creative.canViewFinancials },
    { key: "canManageClients", label: t("manageClients"), description: t("permissionDescClients"), value: creative.canManageClients },
    { key: "canManageAllProjects", label: t("manageAllProjects"), description: t("permissionDescProjects"), value: creative.canManageAllProjects },
    { key: "canInvoice", label: t("invoicing"), description: t("permissionDescInvoicing"), value: creative.canInvoice },
    { key: "canViewLeads", label: t("viewLeads"), description: t("permissionDescLeads"), value: (creative as any).canViewLeads },
    { key: "canViewAccounting", label: t("viewAccounting"), description: t("permissionDescAccounting"), value: (creative as any).canViewAccounting },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Card className={`bg-white dark:bg-slate-900 border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow group ${isArchived ? "opacity-60" : ""}`}>
        <div className={`h-1 ${isArchived ? "bg-slate-300" : "bg-gradient-to-r from-primary to-violet-400"}`} />
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl flex-shrink-0 ${isArchived ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500" : "bg-primary/10 text-primary"}`}>
              {creative.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Link href={`/photographers/${creative.id}`}>
                    <CardTitle className="text-base font-bold tracking-tight truncate hover:text-primary cursor-pointer">{creative.name}</CardTitle>
                  </Link>
                  {isArchived && (
                    <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 flex-shrink-0">
                      <Archive className="w-3 h-3 mr-1" />
                      {t("archived")}
                    </Badge>
                  )}
                </div>
                {!isArchived && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {confirmArchive ? (
                      <>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs rounded-lg px-2"
                          onClick={handleArchive}
                          disabled={archiveUser.isPending}
                        >
                          {t("confirmArchive")}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg px-2" onClick={() => setConfirmArchive(false)}>
                          {t("cancel")}
                        </Button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmArchive(true)}
                        className="text-slate-300 hover:text-amber-500 dark:text-amber-400 transition-colors p-1"
                        title={t("archiveAccount")}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-500 truncate">{creative.email || creative.username}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className={`text-xs font-medium border ${profColor}`}>
                  <ProfIcon className="w-3 h-3 mr-1" />
                  {professionLabel}
                </Badge>
                <Badge className={`text-xs font-medium border ${isSalaried ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" : "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"}`}>
                  {isSalaried ? (
                    <><Banknote className="w-3 h-3 mr-1" /> {t("monthlySalaryAmount")}</>
                  ) : (
                    <><Briefcase className="w-3 h-3 mr-1" /> {t("perProjectDesc")}</>
                  )}
                </Badge>
                {isSalaried && (creative as any).salaryAmount && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium">
                    {Number((creative as any).salaryAmount).toLocaleString()} {t("perMonthShort")}
                  </span>
                )}
                {!isArchived && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">{activeProjects.length} {t("activeProjects").toLowerCase()}</span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Archive notice */}
          {isArchived && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-100 dark:border-amber-900 text-sm text-amber-800 dark:text-amber-200">
              <ArchiveRestore className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500 dark:text-amber-400" />
              <div className="flex-1 min-w-0">
                <span>{t("archivedNotice")}</span>
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs rounded-lg border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 dark:bg-emerald-950 gap-1.5"
                    onClick={handleRestore}
                    disabled={isRestoring}
                  >
                    <ArchiveRestore className="w-3 h-3" />
                    {isRestoring ? t("restoring") : t("restoreAccount")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Active Projects */}
          {!isArchived && activeProjects.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">{t("activeProjects")}</div>
              <div className="flex flex-wrap gap-1.5">
                {activeProjects.slice(0, 3).map((p: any) => (
                  <Badge key={p.id} variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                    {p.title}
                  </Badge>
                ))}
                {activeProjects.length > 3 && (
                  <Badge variant="outline" className="text-xs">+{activeProjects.length - 3} {t("more")}</Badge>
                )}
              </div>
            </div>
          )}

          {/* Permissions Panel — only for active users */}
          {!isArchived && (
            <Collapsible open={permOpen} onOpenChange={setPermOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    {t("permissions")}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${permOpen ? "rotate-180" : ""}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-3 px-1">
                  {permissions.map((perm) => (
                    <div key={perm.key} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{perm.label}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 truncate">{perm.description}</div>
                      </div>
                      <Switch
                        checked={perm.value}
                        onCheckedChange={(v) => togglePermission(perm.key, v)}
                        className="flex-shrink-0"
                      />
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Photographers() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useListUsers();
  const createUser = useCreateUser();

  const allCreatives = users.filter((u: any) => u.role === "photographer");
  const activeCreatives = allCreatives.filter((u: any) => !u.archivedAt);
  const archivedCreatives = allCreatives.filter((u: any) => u.archivedAt);

  const [open, setOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [customProfession, setCustomProfession] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    email: "",
    profession: "",
    paymentType: "per_project",
    salaryAmount: "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.username || !form.password) return;
    const profession = showCustom ? customProfession : form.profession;
    try {
      await createUser.mutateAsync({
        data: {
          name: form.name,
          username: form.username,
          password: form.password,
          email: form.email || null,
          role: "photographer",
          profession: profession || null,
          paymentType: form.paymentType as any,
          salaryAmount: form.paymentType === "monthly_salary" && form.salaryAmount ? parseFloat(form.salaryAmount) : null,
          canViewFinancials: false,
          canManageClients: false,
          canManageAllProjects: false,
          canInvoice: false,
        } as any,
      });
      qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
      setForm({ name: "", username: "", password: "", email: "", profession: "", paymentType: "per_project", salaryAmount: "" });
      setCustomProfession("");
      setShowCustom(false);
      setOpen(false);
      toast({ description: t("creativeAdded") });
    } catch {
      toast({ variant: "destructive", description: t("failedToAddCreative") });
    }
  };

  const displayedCreatives = showArchived ? archivedCreatives : activeCreatives;

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            {t("photographers")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">
            {activeCreatives.length} {t("photographers").toLowerCase()} {t("activeProjects").toLowerCase()}
            {archivedCreatives.length > 0 && ` • ${archivedCreatives.length} ${t("archived")}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {archivedCreatives.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-xl text-slate-500 dark:text-slate-400 dark:text-slate-500"
              onClick={() => setShowArchived((v) => !v)}
            >
              <Archive className="h-4 w-4" />
              {showArchived ? t("showActive") : `${t("archivedWithCount")} (${archivedCreatives.length})`}
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl">
                <Plus className="h-4 w-4" />
                {t("addCreative")}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">{t("addCreative")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("fullName")} *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder={t("fullNamePlaceholder")}
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("professionLabel")} *</Label>
                  {!showCustom ? (
                    <Select
                      value={form.profession}
                      onValueChange={(v) => {
                        if (v === "__other__") {
                          setShowCustom(true);
                          setForm((f) => ({ ...f, profession: "" }));
                        } else {
                          setForm((f) => ({ ...f, profession: v }));
                        }
                      }}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder={t("selectProfession")} />
                      </SelectTrigger>
                      <SelectContent>
                        {PROFESSIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.value === "custom" ? t("addOtherProfession") : PROFESSION_KEY_MAP[p.value] ? t(PROFESSION_KEY_MAP[p.value]) : p.value}
                          </SelectItem>
                        ))}
                        <SelectItem value="__other__">{t("addOtherProfession")}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={customProfession}
                        onChange={(e) => setCustomProfession(e.target.value)}
                        placeholder={t("customProfessionPlaceholder")}
                        className="rounded-xl flex-1"
                      />
                      <Button type="button" variant="ghost" size="sm" className="rounded-xl" onClick={() => setShowCustom(false)}>
                        ←
                      </Button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("username")} *</Label>
                    <Input
                      value={form.username}
                      onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                      placeholder={t("usernameFieldPlaceholder")}
                      className="rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("password")} *</Label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder={t("passwordFieldPlaceholder")}
                      className="rounded-xl"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("emailOptional")}</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder={t("emailPlaceholder2")}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("paymentTypeLabel")} *</Label>
                  <Select
                    value={form.paymentType}
                    onValueChange={(v) => setForm((f) => ({ ...f, paymentType: v, salaryAmount: "" }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_project">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          {t("perProjectDesc")}
                        </div>
                      </SelectItem>
                      <SelectItem value="monthly_salary">
                        <div className="flex items-center gap-2">
                          <Banknote className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          {t("monthlySalaryDesc")}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.paymentType === "monthly_salary" && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("monthlySalaryAmount")} *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      value={form.salaryAmount}
                      onChange={(e) => setForm((f) => ({ ...f, salaryAmount: e.target.value }))}
                      placeholder={t("salaryPlaceholder")}
                      className="rounded-xl"
                      required
                    />
                    <p className="text-xs text-slate-400 dark:text-slate-500">{t("salaryHelper")}</p>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setOpen(false)}>
                    {t("cancel")}
                  </Button>
                  <Button type="submit" className="flex-1 rounded-xl" disabled={createUser.isPending}>
                    {createUser.isPending ? t("adding") : t("addCreative")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => <div key={i} className="h-56 bg-white dark:bg-slate-900 border border-border rounded-2xl animate-pulse" />)}
        </div>
      ) : displayedCreatives.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-dashed border-border rounded-2xl">
          <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
            {showArchived ? t("noArchivedCreatives") : t("noCreativesYet")}
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            {showArchived ? t("archivedNotice") : t("addCreative")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence>
            {displayedCreatives.map((c, i) => (
              <CreativeCard key={c.id} creative={c} index={i} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
